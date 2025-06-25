import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { searchJobs } from '@/lib/services/search';
import { fetchJobContentWithRetry } from '@/lib/services/content';
import { validateJobContent } from '@/lib/services/content-validator';
import { analyzeJobFit } from '@/lib/services/ai';
import { parseJobFromSearch, generateContentHash } from '@/lib/utils/parsers';

export async function POST(request: NextRequest) {
  console.log('Starting job search stream...');
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Parse request body
        const { userId, resume, preferences, jobTitle } = await request.json();
        
        if (!userId || !resume || !jobTitle) {
          throw new Error('Missing required fields: userId, resume, and jobTitle');
        }
        
        // Send initial progress
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          data: { current: 0, total: 0, status: 'Starting job search...' }
        })}\n\n`));
        
        // Ensure user exists in database
        await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: { id: userId }
        });
        
        // Perform job search
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          data: { current: 0, total: 0, status: 'Searching for jobs...' }
        })}\n\n`));
        
        const searchResults = await searchJobs(jobTitle);
        const totalJobs = searchResults.length;
        
        if (totalJobs === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            data: { total_processed: 0, total_applied: 0, message: 'No jobs found' }
          })}\n\n`));
          controller.close();
          return;
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          data: { current: 0, total: totalJobs, status: `Found ${totalJobs} jobs, processing...` }
        })}\n\n`));
        
        let processedCount = 0;
        let appliedCount = 0;
        
        // Process each job
        for (const searchResult of searchResults) {
          try {
            processedCount++;
            
            // Parse basic job info
            const jobData = parseJobFromSearch(searchResult);
            
            // Send progress update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              data: { 
                current: processedCount, 
                total: totalJobs, 
                status: `Processing: ${jobData.title} at ${jobData.company}...` 
              }
            })}\n\n`));
            
            // Fetch job content
            let rawContent = '';
            try {
              rawContent = await fetchJobContentWithRetry(jobData.url, 2);
            } catch (error) {
              console.error(`Failed to fetch content for ${jobData.url}:`, error);
              rawContent = `Job URL: ${jobData.url}\nContent could not be retrieved.`;
            }
            
            // Validate if this is an individual job posting
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              data: { 
                current: processedCount, 
                total: totalJobs, 
                status: `Validating content for: ${jobData.title}...` 
              }
            })}\n\n`));

            const validation = await validateJobContent(jobData.url, rawContent);
            
            if (!validation.isValidJobPosting) {
              console.log(`Skipping ${jobData.url} - not an individual job posting (${validation.postingType})`);
              
              // Stream a skipped job result
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'job_skipped',
                data: {
                  url: jobData.url,
                  title: jobData.title,
                  company: jobData.company,
                  reason: validation.postingType === 'LISTING' ? 'Job listing page' : 'No job information found'
                }
              })}\n\n`));
              
              continue; // Skip to next job
            }
            
            // Use validated content for analysis
            const content = validation.content;
            
            // Analyze job fit with Together AI
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              data: { 
                current: processedCount, 
                total: totalJobs, 
                status: `Analyzing fit for: ${jobData.title}...` 
              }
            })}\n\n`));

            const jobAnalysis = await analyzeJobFit(content, resume, preferences);
            const contentHash = generateContentHash(content);
            
            // Save to database
            const savedJob = await prisma.processedJob.create({
              data: {
                userId,
                title: jobData.title,
                company: jobData.company,
                location: jobData.location,
                salary: jobData.salary,
                url: jobData.url,
                content,
                recommendation: jobAnalysis.recommendation,
                fitScore: jobAnalysis.fitScore,
                confidence: jobAnalysis.confidence,
                summary: jobAnalysis.summary,
                analysis: jobAnalysis.analysis,
                contentHash
              }
            });
            
            if (jobAnalysis.recommendation === 'apply') {
              appliedCount++;
            }
            
            // Stream job result to client
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'job',
              data: {
                id: savedJob.id,
                title: savedJob.title,
                company: savedJob.company,
                location: savedJob.location,
                salary: savedJob.salary,
                url: savedJob.url,
                recommendation: savedJob.recommendation,
                fitScore: savedJob.fitScore,
                confidence: savedJob.confidence,
                summary: savedJob.summary,
                createdAt: savedJob.createdAt
              }
            })}\n\n`));
            
            // Small delay to prevent overwhelming the client
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            console.error(`Error processing job:`, error);
            // Continue with next job on error
          }
        }
        
        // Send completion message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          data: { 
            total_processed: processedCount, 
            total_applied: appliedCount,
            message: `Processed ${processedCount} jobs, ${appliedCount} recommended for application`
          }
        })}\n\n`));
        
      } catch (error) {
        console.error('Stream error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          data: { message: error instanceof Error ? error.message : 'Unknown error occurred' }
        })}\n\n`));
      }
      
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}