import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchNewJobsWithDuplicateHandling } from '@/lib/services/search';
import { fetchJobContentWithRetry } from '@/lib/services/content';
import { extractJobContent } from '@/lib/services/content-validator';
import { analyzeJobFit } from '@/lib/services/ai';
import { parseJobFromSearch, generateContentHash } from '@/lib/utils/parsers';
import { SearchSession } from '@prisma/client';

// Helper function to update search session progress
async function updateSearchProgress(
  sessionId: string, 
  progress: { current: number; total: number; message: string }, 
  status?: string
) {
  const updateData: {
    progress: { current: number; total: number; message: string };
    updatedAt: Date;
    status?: string;
    completedAt?: Date;
  } = {
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

// Helper function to check if client is still connected
function checkClientConnected(controller: ReadableStreamDefaultController, encoder: TextEncoder): boolean {
  try {
    // Try to send an empty data chunk - if client disconnected, this will throw
    controller.enqueue(encoder.encode(''));
    return true;
  } catch (error) {
    console.log('Client disconnected, stopping search processing');
    return false;
  }
}

export async function POST(request: NextRequest) {
  console.log('Starting job search stream...');
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      let searchSession: SearchSession | null = null;
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
            status: { in: ['pending', 'in_progress', 'paused'] },
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
        
        // Auto-detect session state and calculate batch parameters
        let currentSession = searchSession;
        let batchSize = 30;
        
        // Check if this is a continuation of existing session
        const existingActiveSession = await prisma.searchSession.findFirst({
          where: {
            userId,
            status: { in: ['pending', 'in_progress', 'paused'] },
            createdAt: { gte: twoHoursAgo }
          }
        });
        
        if (existingActiveSession && existingActiveSession.id !== searchSession.id) {
          // Use existing session instead
          currentSession = existingActiveSession;
          batchSize = currentSession.batchSize;
        }
        
        // Check for session expiration (48 hours)
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        if (currentSession.createdAt < fortyEightHoursAgo) {
          // Session expired, start fresh
          console.log(`Session ${currentSession.id} expired, starting fresh search`);
          batchSize = 30;
          
          // Update session to reset pagination
          await prisma.searchSession.update({
            where: { id: currentSession.id },
            data: {
              currentPage: 1,
              processedCount: 0,
              totalResults: null
            }
          });
        }
        
        const { items: searchResults, totalResults, finalPage } = await fetchNewJobsWithDuplicateHandling(
          jobTitle,
          userId,
          currentSession.currentPage,
          batchSize
        );
        
        // Update session with total results
        await prisma.searchSession.update({
          where: { id: currentSession.id },
          data: {
            totalResults: currentSession.totalResults !== totalResults ? totalResults : currentSession.totalResults
          }
        });
        
        // Notify client if total results changed
        if (currentSession.totalResults && currentSession.totalResults !== totalResults) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'results_changed',
            data: { 
              oldTotal: currentSession.totalResults, 
              newTotal: totalResults,
              message: `Search updated: Now ${totalResults} jobs (was ${currentSession.totalResults})`
            }
          })}\n\n`));
        }
        
        const totalJobs = searchResults.length;
        
        if (totalJobs === 0) {
          await updateSearchProgress(currentSession.id, { current: currentSession.processedCount, total: totalResults, message: 'No jobs found in this batch' }, 'completed');
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            data: { total_processed: currentSession.processedCount, total_applied: 0, message: 'No jobs found in this batch' }
          })}\n\n`));
          controller.close();
          return;
        }
        
        const foundJobsProgress = { current: currentSession.processedCount, total: totalResults, message: `Processing batch ${currentSession.currentPage}: ${totalJobs} jobs in this batch, ${totalResults} total jobs found` };
        await updateSearchProgress(currentSession.id, foundJobsProgress);
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          data: { current: currentSession.processedCount, total: totalResults, status: foundJobsProgress.message }
        })}\n\n`));
        
        // Check if client is still connected before starting job processing
        if (!checkClientConnected(controller, encoder)) {
          console.log('Client disconnected before job processing, marking as paused');
          await updateSearchProgress(currentSession.id, {
            current: currentSession.processedCount,
            total: totalResults,
            message: 'Search paused by user'
          }, 'paused');
          return;
        }
        
        let processedCount = 0;
        let appliedCount = 0;
        
        // Process each job
        for (const searchResult of searchResults) {
          try {
            // Check if client is still connected before processing each job
            if (!checkClientConnected(controller, encoder)) {
              console.log('Client disconnected, marking session as paused and stopping');
              await updateSearchProgress(currentSession.id, {
                current: currentSession.processedCount + processedCount,
                total: totalResults,
                message: 'Search paused by user'
              }, 'paused');
              return;
            }
            
            processedCount++;
            
            // Parse basic job info
            const jobData = parseJobFromSearch(searchResult);
            
            // Update progress in database and stream
            const overallProcessed = currentSession.processedCount + processedCount;
            const processingProgress = { 
              current: overallProcessed, 
              total: totalResults, 
              message: `Processing job ${overallProcessed} of ${totalResults}: ${jobData.title} at ${jobData.company}...` 
            };
            await updateSearchProgress(currentSession.id, processingProgress);
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              data: { 
                current: overallProcessed, 
                total: totalResults, 
                status: processingProgress.message
              }
            })}\n\n`));
            
            // Note: Duplicate checking is now handled in fetchNewJobsWithDuplicateHandling
            // so we don't need to check for existing jobs here
            
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
                current: overallProcessed, 
                total: totalResults, 
                status: `Validating content for job ${overallProcessed}: ${jobData.title}...` 
              }
            })}\n\n`));

            const jobUrl = jobData.url;

            // https://jobs.ashbyhq.com/themuralgroup/02484fdc-1695-470a-a94a-4cbf2c55c37a/application
            // if it's an ashbyhq job and has /application at the end, remove it
            if(jobUrl.includes('ashbyhq') && jobUrl.endsWith('/application')) {
              jobData.url = jobUrl.slice(0, -11);
            }

            const validation = await extractJobContent(rawContent);
            
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
            
            // Check client connection before AI analysis (expensive operation)
            if (!checkClientConnected(controller, encoder)) {
              console.log('Client disconnected during processing, pausing');
              await updateSearchProgress(currentSession.id, {
                current: currentSession.processedCount + processedCount,
                total: totalResults,
                message: 'Search paused by user'
              }, 'paused');
              return;
            }

            // Analyze job fit with Together AI
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              data: { 
                current: overallProcessed, 
                total: totalResults, 
                status: `Analyzing fit for job ${overallProcessed}: ${jobData.title}...` 
              }
            })}\n\n`));

            const jobAnalysis = await analyzeJobFit(content, resume, preferences);
            const contentHash = generateContentHash(content);
            
            // Save to database
            const savedJob = await prisma.processedJob.create({
              data: {
                userId,
                title: jobAnalysis.summary.role,
                company: jobAnalysis.summary.company,
                location: jobAnalysis.summary.location,
                salary: jobAnalysis.summary.salary_range,
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
                companySummary: jobAnalysis.company_summary,
                whyGoodFit: JSON.stringify(jobAnalysis.why_good_fit || []),
                potentialConcerns: JSON.stringify(jobAnalysis.potential_concerns || []),
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
                company_summary: savedJob.companySummary,
                why_good_fit: savedJob.whyGoodFit ? JSON.parse(savedJob.whyGoodFit) : [],
                potential_concerns: savedJob.potentialConcerns ? JSON.parse(savedJob.potentialConcerns) : [],
                createdAt: savedJob.createdAt,
                analysis: savedJob.analysis
              }
            })}\n\n`));
            
            // Small delay to prevent overwhelming the client
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            console.error(`Error processing job:`, error);
            // Continue with next job on error
          }
        }
        
        // Update session progress and pagination
        const newProcessedCount = currentSession.processedCount + processedCount;
        const newCurrentPage = finalPage + 1; // Use finalPage from duplicate handling
        const remaining = totalResults - newProcessedCount;
        
        await prisma.searchSession.update({
          where: { id: currentSession.id },
          data: {
            processedCount: newProcessedCount,
            currentPage: newCurrentPage,
            progress: {
              current: newProcessedCount,
              total: totalResults,
              message: `Processed ${newProcessedCount} jobs, ${appliedCount} recommended for application`
            }
          }
        });
        
        // Check if client is still connected before sending completion message
        if (!checkClientConnected(controller, encoder)) {
          console.log('Client disconnected before batch completion, marking as cancelled');
          await updateSearchProgress(currentSession.id, {
            current: processedCount,
            total: totalJobs,
            message: 'Search cancelled by user'
          }, 'failed');
          return;
        }

        // Check if we're fully done (processed all available jobs) or just finished a batch
        const isFullyComplete = newProcessedCount >= totalResults;
        const isBatchComplete = !isFullyComplete && processedCount > 0;
        
        if (isFullyComplete) {
          // Mark search as fully completed - processed all available jobs
          await updateSearchProgress(currentSession.id, { 
            current: newProcessedCount, 
            total: totalResults, 
            message: `Completed: Processed all ${newProcessedCount} jobs, ${appliedCount} recommended for application` 
          }, 'completed');
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            data: { 
              total_processed: newProcessedCount, 
              total_applied: appliedCount,
              message: `Completed: Processed all ${newProcessedCount} jobs, ${appliedCount} recommended for application`
            }
          })}\n\n`));
        } else if (isBatchComplete) {
          // Batch complete, but more jobs remain - keep session active for continuation
          await updateSearchProgress(currentSession.id, { 
            current: newProcessedCount, 
            total: totalResults, 
            message: `Processed ${newProcessedCount} of ${totalResults} jobs, ${appliedCount} recommended for application` 
          }, 'in_progress');
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'batch_complete',
            data: { 
              batch_processed: processedCount,
              total_processed: newProcessedCount,
              total_results: totalResults,
              remaining: remaining,
              total_applied: appliedCount,
              message: `Processed ${newProcessedCount} of ${totalResults} jobs. ${remaining} remaining.`
            }
          })}\n\n`));
        } else {
          // No jobs were processed (all were duplicates or errors), but session continues
          await updateSearchProgress(currentSession.id, { 
            current: newProcessedCount, 
            total: totalResults, 
            message: `No new jobs processed in this batch. ${remaining} jobs remaining to check.` 
          }, 'in_progress');
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'batch_complete',
            data: { 
              batch_processed: 0,
              total_processed: newProcessedCount,
              total_results: totalResults,
              remaining: remaining,
              total_applied: appliedCount,
              message: `No new jobs in this batch. ${remaining} jobs remaining to check.`
            }
          })}\n\n`));
        }
        
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