import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { searchJobs } from '@/lib/services/search';
import { fetchJobContentWithRetry } from '@/lib/services/content';
import { validateJobContent } from '@/lib/services/content-validator';
import { analyzeJobFit } from '@/lib/services/ai';
import { parseJobFromSearch, generateContentHash } from '@/lib/utils/parsers';

// Helper function to update search session progress
async function updateSearchProgress(
  sessionId: string, 
  progress: { current: number; total: number; message: string }, 
  status?: string
) {
  const updateData: any = {
    progress,
    updatedAt: new Date()
  };
  
  if (status) {
    updateData.status = status;
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }
  }

  await prisma.searchSession.update({
    where: { id: sessionId },
    data: updateData
  });
}

export async function POST(request: NextRequest) {
  console.log('Starting job search stream...');
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      let searchSession: any = null;
      try {
        // Parse request body
        const { userId, resume, preferences, jobTitle } = await request.json();
        
        if (!userId || !resume || !jobTitle) {
          throw new Error('Missing required fields: userId, resume, and jobTitle');
        }

        // Check for existing active search (prevent concurrent searches)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const existingSession = await prisma.searchSession.findFirst({
          where: {
            userId,
            status: { in: ['pending', 'in_progress'] },
            createdAt: { gte: twoHoursAgo }
          }
        });

        if (existingSession) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            data: { message: 'Search already in progress. Please wait for it to complete or cancel it first.' }
          })}\n\n`));
          controller.close();
          return;
        }
        
        // Ensure user exists in database
        await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: { id: userId }
        });

        // Create new search session
        searchSession = await prisma.searchSession.create({
          data: {
            userId,
            status: 'pending',
            progress: { current: 0, total: 0, message: 'Starting job search...' },
            jobTitle
          }
        });

        // Send initial progress
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          data: { current: 0, total: 0, status: 'Starting job search...' }
        })}\n\n`));
        
        // Update to in_progress and perform job search
        const searchProgress = { current: 0, total: 0, message: 'Searching for jobs...' };
        await updateSearchProgress(searchSession.id, searchProgress, 'in_progress');
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          data: { current: 0, total: 0, status: 'Searching for jobs...' }
        })}\n\n`));
        
        const searchResults = await searchJobs(jobTitle);
        const totalJobs = searchResults.length;
        
        if (totalJobs === 0) {
          await updateSearchProgress(searchSession.id, { current: 0, total: 0, message: 'No jobs found' }, 'completed');
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            data: { total_processed: 0, total_applied: 0, message: 'No jobs found' }
          })}\n\n`));
          controller.close();
          return;
        }
        
        const foundJobsProgress = { current: 0, total: totalJobs, message: `Found ${totalJobs} jobs, processing...` };
        await updateSearchProgress(searchSession.id, foundJobsProgress);
        
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
            
            // Update progress in database and stream
            const processingProgress = { 
              current: processedCount, 
              total: totalJobs, 
              message: `Processing: ${jobData.title} at ${jobData.company}...` 
            };
            await updateSearchProgress(searchSession.id, processingProgress);
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              data: { 
                current: processedCount, 
                total: totalJobs, 
                status: processingProgress.message
              }
            })}\n\n`));
            
            // Check if job already processed for this user
            const existingJob = await prisma.processedJob.findFirst({
              where: {
                userId,
                url: jobData.url
              }
            });
            
            if (existingJob) {
              console.log(`Skipping ${jobData.url} - already processed for user ${userId}`);
              
              // Stream a skipped job result
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'job_skipped',
                data: {
                  url: jobData.url,
                  title: jobData.title,
                  company: jobData.company,
                  reason: 'Already processed for this user'
                }
              })}\n\n`));
              
              continue; // Skip to next job
            }
            
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
                summary: typeof jobAnalysis.summary === 'object' 
                  ? `${jobAnalysis.summary.role} at ${jobAnalysis.summary.company}`
                  : jobAnalysis.summary || 'No summary available',
                analysis: jobAnalysis.analysis,
                jobSummary: jobAnalysis.job_summary,
                fitSummary: jobAnalysis.fit_summary,
                whyGoodFit: JSON.stringify(jobAnalysis.why_good_fit || []),
                potentialConcerns: JSON.stringify(jobAnalysis.potential_concerns || []),
                keyTechnologies: JSON.stringify(jobAnalysis.summary?.key_technologies || []),
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
                job_summary: savedJob.jobSummary,
                fit_summary: savedJob.fitSummary,
                why_good_fit: savedJob.whyGoodFit ? JSON.parse(savedJob.whyGoodFit) : [],
                potential_concerns: savedJob.potentialConcerns ? JSON.parse(savedJob.potentialConcerns) : [],
                key_technologies: savedJob.keyTechnologies ? JSON.parse(savedJob.keyTechnologies) : [],
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
        
        // Mark search as completed and send completion message
        const completionMessage = `Processed ${processedCount} jobs, ${appliedCount} recommended for application`;
        await updateSearchProgress(searchSession.id, { 
          current: processedCount, 
          total: totalJobs, 
          message: completionMessage 
        }, 'completed');
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          data: { 
            total_processed: processedCount, 
            total_applied: appliedCount,
            message: completionMessage
          }
        })}\n\n`));
        
      } catch (error) {
        console.error('Stream error:', error);
        
        // Mark search as failed if we have a session
        if (searchSession?.id) {
          await updateSearchProgress(searchSession.id, { 
            current: 0, 
            total: 0, 
            message: 'Search failed due to error' 
          }, 'failed').catch(console.error);
        }
        
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