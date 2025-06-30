import { NextRequest, NextResponse } from 'next/server';
import { fetchJobContentWithRetry } from '@/lib/services/content';
import { extractJobContent } from '@/lib/services/content-validator';
import { analyzeJobFit } from '@/lib/services/ai';

/**
 * POST endpoint to analyze job fit by providing a URL
 * This route accepts a URL, fetches and validates the job content,
 * then analyzes the job fit based on the provided resume and preferences
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { url, resume, preferences } = await request.json();
    
    // Validate required fields
    if (!url || !resume) {
      return NextResponse.json(
        { error: 'Missing required fields: url and resume' },
        { status: 400 }
      );
    }

    // Fetch job content
    let rawContent = '';
    try {
      rawContent = await fetchJobContentWithRetry(url, 2);
    } catch (error) {
      console.error(`Failed to fetch content for ${url}:`, error);
      return NextResponse.json(
        { error: 'Failed to fetch job content', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    // Validate if this is an individual job posting
    const validation = await extractJobContent(rawContent);
    
    if (!validation.isValidJobPosting) {
      return NextResponse.json(
        { 
          error: 'Not a valid job posting',
          postingType: validation.postingType,
          details: validation.postingType === 'LISTING' ? 'Job listing page' : 'No job information found'
        },
        { status: 400 }
      );
    }
    
    // Use validated content for analysis
    const content = validation.content;
    
    // Analyze job fit
    const jobAnalysis = await analyzeJobFit(content, resume, preferences);
    
    // Return the analysis results
    return NextResponse.json(jobAnalysis, { status: 200 });
    
  } catch (error) {
    console.error('Job analysis error:', error);
    
    return NextResponse.json(
      { error: 'Failed to analyze job', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
