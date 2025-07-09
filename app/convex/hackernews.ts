import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { fetchHackerNewsThread as fetchHNThread } from "../src/lib/services/hackernews";
import { extractJobFromComment } from "../src/lib/services/hackernews-job-extractor";
import { RateLimitError } from "../src/lib/services/llm";
import { analyzeHackerNewsJob } from "../src/lib/services/hackernews-job-analyzer";
import { JobAnalysis } from "../src/types/job.types";
import { Doc, Id } from "./_generated/dataModel";

// Action to fetch thread data from HackerNews API
export const fetchHackerNewsThread = action({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    try {
      console.log(`Fetching thread ${args.threadId} from HackerNews API...`);
      
      // Check if thread already exists
      const existingThread = await ctx.runQuery(api.hackernews.checkThreadExists, {
        threadId: args.threadId,
      });
      
      // Mark as fetching
      if (existingThread) {
        await ctx.runMutation(api.hackernews.markThreadAsFetching, {
          threadId: args.threadId,
        });
      }
      
      // Fetch thread and comments using shared service (external API call)
      const hnData = await fetchHNThread(args.threadId);
      
      // Store the fetched data using mutations
      const result = await ctx.runMutation(api.hackernews.storeThreadData, {
        threadId: args.threadId,
        threadData: hnData.thread,
        comments: hnData.comments,
      });
      
      console.log(`Successfully fetched thread ${args.threadId} with ${hnData.comments.length} comments`);
      return result;
      
    } catch (error) {
      console.error(`Error fetching thread ${args.threadId}:`, error);
      
      // Mark thread as failed
      await ctx.runMutation(api.hackernews.markThreadAsFailed, {
        threadId: args.threadId,
      });
      
      throw error;
    }
  },
});

// Helper query to check if thread exists
export const checkThreadExists = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args): Promise<{threadId: string, shouldSkip: boolean} | null> => {
    const existingThread = await ctx.db
      .query("hackernews_threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    
    if (!existingThread) {
      return null;
    }
    
    return {
      threadId: existingThread._id,
      shouldSkip: false, // Always fetch to get latest comments
    };
  },
});

// Mutation to mark thread as being fetched
export const markThreadAsFetching = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const existingThread = await ctx.db
      .query("hackernews_threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    
    if (existingThread) {
      await ctx.db.patch(existingThread._id, {
        processingStatus: "fetching",
        lastFetched: Date.now(),
      });
    }
  },
});

// Mutation to store thread data and comments
export const storeThreadData = mutation({
  args: {
    threadId: v.string(),
    threadData: v.any(), // HackerNewsThread object
    comments: v.any(), // Comment[] array
  },
  handler: async (ctx, args): Promise<string> => {
    const now = Date.now();
    
    // Check if thread already exists
    const existingThread = await ctx.db
      .query("hackernews_threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    
    // Create or update thread record
    const threadData = {
      threadId: args.threadId,
      title: args.threadData.title,
      author: args.threadData.author,
      time: args.threadData.time,
      url: args.threadData.url,
      processingStatus: "idle" as const,
      totalComments: args.comments.length,
      processedComments: 0,
      requestsInCurrentMinute: 0,
      currentMinuteStart: Math.floor(now / 60000) * 60000,
      maxRequestsPerMinute: 40,
      lastFetched: now,
      createdAt: existingThread?.createdAt || now,
    };
    
    let threadDbId: Id<"hackernews_threads">;
    const isNewThread = !existingThread;
    
    if (existingThread) {
      await ctx.db.patch(existingThread._id, threadData);
      threadDbId = existingThread._id;
    } else {
      threadDbId = await ctx.db.insert("hackernews_threads", threadData);
    }
    
    // Store comments
    for (const comment of args.comments) {
      const existingComment = await ctx.db
        .query("hackernews_comments")
        .withIndex("by_commentId", (q) => q.eq("commentId", comment.id.toString()))
        .first();
      
      const commentData = {
        commentId: comment.id.toString(),
        threadId: args.threadId,
        author: comment.author,
        text: comment.text,
        time: comment.time,
        processingStatus: "unprocessed" as const,
        processingAttempts: 0,
        createdAt: now,
      };
      
      if (existingComment) {
        // Only update if comment text has changed or if it failed before
        if (existingComment.text !== comment.text || existingComment.processingStatus === "failed") {
          await ctx.db.patch(existingComment._id, {
            ...commentData,
            processingStatus: "unprocessed" as const,
            processingAttempts: 0,
            processingErrors: undefined,
            lastAttemptAt: undefined,
            jobData: undefined,
          });
        }
      } else {
        await ctx.db.insert("hackernews_comments", commentData);
      }
    }
    
    // Auto-start processing if thread is idle and has unprocessed comments
    if (args.comments.length > 0) {
      // Check if there are any unprocessed comments
      const unprocessedCount = await ctx.db
        .query("hackernews_comments")
        .withIndex("by_thread_and_status", (q) => 
          q.eq("threadId", args.threadId).eq("processingStatus", "unprocessed")
        )
        .collect()
        .then(comments => comments.length);
      
      // Get current thread status after storage
      const currentThread = await ctx.db.get(threadDbId);
      const shouldAutoStart = currentThread?.processingStatus === "idle" && unprocessedCount > 0;
      
      if (shouldAutoStart) {
        console.log(`Auto-starting processing for thread ${args.threadId} (${isNewThread ? 'new' : 'existing'}) with ${unprocessedCount} unprocessed comments`);
        // Schedule the first comment to be processed
        await ctx.scheduler.runAfter(0, api.hackernews.processNextComment, {
          threadId: args.threadId,
        });
        
        // Update thread status to processing
        await ctx.db.patch(threadDbId, {
          processingStatus: "processing",
          lastProcessedAt: Date.now(),
        });
      } else {
        console.log(`Thread ${args.threadId} status: ${currentThread?.processingStatus}, unprocessed: ${unprocessedCount}, not auto-starting`);
      }
    }
    
    return threadDbId as string;
  },
});

// Mutation to mark thread as failed
export const markThreadAsFailed = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const existingThread = await ctx.db
      .query("hackernews_threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    
    if (existingThread) {
      await ctx.db.patch(existingThread._id, {
        processingStatus: "failed",
      });
    }
  },
});

// Mutation to check if processing should be started for an existing thread
export const checkAndStartProcessing = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    // Get thread status
    const thread = await ctx.db
      .query("hackernews_threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    
    if (!thread) {
      console.log(`Thread ${args.threadId} not found, cannot check processing status`);
      return;
    }
    
    // Only auto-start if thread is idle
    if (thread.processingStatus !== "idle") {
      console.log(`Thread ${args.threadId} status is ${thread.processingStatus}, not starting processing`);
      return;
    }
    
    // Check if there are unprocessed comments
    const unprocessedCount = await ctx.db
      .query("hackernews_comments")
      .withIndex("by_thread_and_status", (q) => 
        q.eq("threadId", args.threadId).eq("processingStatus", "unprocessed")
      )
      .collect()
      .then(comments => comments.length);
    
    if (unprocessedCount > 0) {
      console.log(`Auto-starting processing for existing idle thread ${args.threadId} with ${unprocessedCount} unprocessed comments`);
      
      // Schedule the first comment to be processed
      await ctx.scheduler.runAfter(0, api.hackernews.processNextComment, {
        threadId: args.threadId,
      });
      
      // Update thread status to processing
      await ctx.db.patch(thread._id, {
        processingStatus: "processing",
        lastProcessedAt: Date.now(),
      });
    } else {
      console.log(`Thread ${args.threadId} has no unprocessed comments, not starting processing`);
    }
  },
});

export const getThreadWithComments = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get thread data
    const thread = await ctx.db
      .query("hackernews_threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    
    if (!thread) {
      return null;
    }
    
    // Get all comments for this thread
    const comments = await ctx.db
      .query("hackernews_comments")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
    //   `isValidJobPosting` is always false because of missing prompt intruction 
    //    fixed now, but current data is invalid
    //   .filter((q) => q.eq(q.field("jobData.isValidJobPosting"), true))
      .collect();
    
    // Sort comments by time (newest first)
    const sortedComments = comments.sort((a, b) => b.time - a.time);
    
    return {
      thread,
      comments: sortedComments,
    };
  },
});

export const processNextComment = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get thread to check status and rate limiting
    const thread = await ctx.db
      .query("hackernews_threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    
    if (!thread) {
      throw new Error(`Thread ${args.threadId} not found`);
    }
    
    // Check if processing is paused
    if (thread.processingStatus === "paused") {
      console.log(`Processing paused for thread ${args.threadId}`);
      return { status: "paused" };
    }
    
    // Check rate limiting (20 requests per minute)
    const currentMinute = Math.floor(now / 60000) * 60000;
    const isNewMinute = currentMinute > thread.currentMinuteStart;
    
    if (isNewMinute) {
      // Reset rate limiting for new minute
      await ctx.db.patch(thread._id, {
        currentMinuteStart: currentMinute,
        requestsInCurrentMinute: 0,
      });
    } else if (thread.requestsInCurrentMinute >= thread.maxRequestsPerMinute) {
      // Rate limit exceeded, schedule retry in next minute
      console.log(`Rate limit exceeded for thread ${args.threadId}, scheduling retry`);
      await ctx.scheduler.runAfter(60000, api.hackernews.processNextComment, {
        threadId: args.threadId,
      });
      return { status: "rate_limited" };
    }
    
    // Find next unprocessed comment (newest first)
    const nextComment = await ctx.db
      .query("hackernews_comments")
      .withIndex("by_thread_status_time", (q) => 
        q.eq("threadId", args.threadId).eq("processingStatus", "unprocessed")
      )
      .order("desc")
      .first();
    
    if (!nextComment) {
      // No more comments to process, mark thread as completed
      await ctx.db.patch(thread._id, {
        processingStatus: "completed",
        lastProcessedAt: now,
      });
      console.log(`Processing completed for thread ${args.threadId}`);
      return { status: "completed" };
    }
    
    // Mark comment as processing
    await ctx.db.patch(nextComment._id, {
      processingStatus: "processing",
      lastAttemptAt: now,
    });
    
    // Update thread status and rate limiting
    await ctx.db.patch(thread._id, {
      processingStatus: "processing",
      requestsInCurrentMinute: thread.requestsInCurrentMinute + 1,
      lastProcessedAt: now,
    });
    
    console.log(`Scheduling LLM extraction for comment ${nextComment.commentId}`);
    
    // Schedule the action to extract job data
    await ctx.scheduler.runAfter(0, api.hackernews.extractJobData, {
      commentId: nextComment._id,
      commentText: nextComment.text,
      threadId: args.threadId,
    });
    
    return { 
      status: "scheduled_extraction",
      commentId: nextComment.commentId,
    };
  },
});

// Action for external LLM API calls
export const extractJobData = action({
  args: {
    commentId: v.id("hackernews_comments"),
    commentText: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`Calling LLM for comment ${args.commentId}`);
      
      // Call external LLM API
      const jobData = await extractJobFromComment(args.commentText);
      
      console.log(`LLM extraction successful for comment ${args.commentId}`);
      
      // Call mutation to update comment and schedule next
      await ctx.runMutation(api.hackernews.updateCommentAndScheduleNext, {
        commentId: args.commentId,
        threadId: args.threadId,
        jobData: jobData,
        success: true,
      });
      
    } catch (error) {
      console.error(`LLM extraction failed for comment ${args.commentId}:`, error);
      
      const isRateLimit = error instanceof RateLimitError;
      
      // Call mutation to handle error and schedule next
      await ctx.runMutation(api.hackernews.updateCommentAndScheduleNext, {
        commentId: args.commentId,
        threadId: args.threadId,
        error: error instanceof Error ? error.message : String(error),
        isRateLimit: isRateLimit,
        success: false,
      });
    }
  },
});

// Mutation to update comment and schedule next processing
export const updateCommentAndScheduleNext = mutation({
  args: {
    commentId: v.id("hackernews_comments"),
    threadId: v.string(),
    success: v.boolean(),
    jobData: v.optional(v.any()),
    error: v.optional(v.string()),
    isRateLimit: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error(`Comment ${args.commentId} not found`);
    }
    
    if (args.success && args.jobData) {
      // Success: Update comment with job data
      await ctx.db.patch(args.commentId, {
        processingStatus: "completed",
        jobData: args.jobData,
        processingAttempts: comment.processingAttempts + 1,
      });
      
      // Update thread's processed count
      const thread = await ctx.db
        .query("hackernews_threads")
        .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
        .first();
      
      if (thread) {
        const newProcessedCount = thread.processedComments + 1;
        await ctx.db.patch(thread._id, {
          processedComments: newProcessedCount,
        });
        
        // Check if all comments are now processed
        if (newProcessedCount >= thread.totalComments) {
          await ctx.db.patch(thread._id, {
            processingStatus: "completed",
            lastProcessedAt: Date.now(),
          });
          console.log(`All comments processed for thread ${args.threadId}`);
          return; // Don't schedule next processing
        }
      }
      
      console.log(`Successfully processed comment ${comment.commentId}`);
      
    } else {
      // Error: Handle retry logic
      if (args.isRateLimit) {
        // Don't increment attempts for rate limits
        await ctx.db.patch(args.commentId, {
          processingStatus: "unprocessed",
        });
        
        console.log(`Rate limited for comment ${comment.commentId}, will retry`);
        
        // Schedule retry in 60 seconds for rate limits
        await ctx.scheduler.runAfter(60000, api.hackernews.processNextComment, {
          threadId: args.threadId,
        });
        return;
        
      } else {
        // Handle other errors with retry logic
        const newAttempts = comment.processingAttempts + 1;
        const maxAttempts = 3;
        
        if (newAttempts >= maxAttempts) {
          // Mark as failed after max attempts
          await ctx.db.patch(args.commentId, {
            processingStatus: "failed",
            processingAttempts: newAttempts,
            processingErrors: [
              ...(comment.processingErrors || []),
              args.error || "Unknown error"
            ],
          });
          
          // Update thread's processed count (failed comments count as processed)
          const thread = await ctx.db
            .query("hackernews_threads")
            .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
            .first();
          
          if (thread) {
            const newProcessedCount = thread.processedComments + 1;
            await ctx.db.patch(thread._id, {
              processedComments: newProcessedCount,
            });
            
            // Check if all comments are now processed
            if (newProcessedCount >= thread.totalComments) {
              await ctx.db.patch(thread._id, {
                processingStatus: "completed",
                lastProcessedAt: Date.now(),
              });
              console.log(`All comments processed for thread ${args.threadId} (some failed)`);
              return; // Don't schedule next processing
            }
          }
          
          console.log(`Comment ${comment.commentId} failed after ${maxAttempts} attempts`);
        } else {
          // Reset to unprocessed for retry
          await ctx.db.patch(args.commentId, {
            processingStatus: "unprocessed",
            processingAttempts: newAttempts,
            processingErrors: [
              ...(comment.processingErrors || []),
              args.error || "Unknown error"
            ],
          });
          
          console.log(`Comment ${comment.commentId} failed, will retry (attempt ${newAttempts}/${maxAttempts})`);
        }
      }
    }
    
    // If we get here, we need to schedule next comment processing
    // (with small delay for errors, immediate for rate limits)
    const delay = args.isRateLimit ? 0 : (args.success ? 0 : 1000);
    await ctx.scheduler.runAfter(delay, api.hackernews.processNextComment, {
      threadId: args.threadId,
    });
  },
});

export const pauseProcessing = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db
      .query("hackernews_threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    
    if (!thread) {
      throw new Error(`Thread ${args.threadId} not found`);
    }
    
    await ctx.db.patch(thread._id, {
      processingStatus: "paused",
      lastProcessedAt: Date.now(),
    });
    
    console.log(`Processing paused for thread ${args.threadId}`);
    return { status: "paused" };
  },
});

export const resumeProcessing = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db
      .query("hackernews_threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    
    if (!thread) {
      throw new Error(`Thread ${args.threadId} not found`);
    }
    
    await ctx.db.patch(thread._id, {
      processingStatus: "processing",
      lastProcessedAt: Date.now(),
    });
    
    // Start processing immediately
    await ctx.scheduler.runAfter(0, api.hackernews.processNextComment, {
      threadId: args.threadId,
    });
    
    console.log(`Processing resumed for thread ${args.threadId}`);
    return { status: "processing" };
  },
});

export const startProcessing = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db
      .query("hackernews_threads")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
    
    if (!thread) {
      throw new Error(`Thread ${args.threadId} not found`);
    }
    
    // Check if there are any unprocessed comments
    const unprocessedCount = await ctx.db
      .query("hackernews_comments")
      .withIndex("by_thread_and_status", (q) => 
        q.eq("threadId", args.threadId).eq("processingStatus", "unprocessed")
      )
      .collect()
      .then(comments => comments.length);
    
    if (unprocessedCount === 0) {
      console.log(`No unprocessed comments found for thread ${args.threadId}`);
      return { status: "no_comments_to_process" };
    }
    
    await ctx.db.patch(thread._id, {
      processingStatus: "processing",
      lastProcessedAt: Date.now(),
    });
    
    // Start processing immediately
    await ctx.scheduler.runAfter(0, api.hackernews.processNextComment, {
      threadId: args.threadId,
    });
    
    console.log(`Processing started for thread ${args.threadId} with ${unprocessedCount} comments`);
    return { 
      status: "processing", 
      unprocessedCount 
    };
  },
});

// Action for analyzing job fit with user's resume and preferences
export const analyzeCommentJobFit = action({
  args: {
    commentId: v.id("hackernews_comments"),
    userId: v.string(),
    resumeText: v.string(),
    preferences: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"hackernews_analyses">> => {
    // Get the comment to analyze
    const comment: Doc<"hackernews_comments"> | null = await ctx.runQuery(api.hackernews.getCommentById, {
      commentId: args.commentId,
    });
    
    if (!comment) {
      throw new Error(`Comment ${args.commentId} not found`);
    }
    
    // Check if analysis already exists for this user/comment
    const existingAnalysis: Doc<"hackernews_analyses"> | null = await ctx.runQuery(api.hackernews.getUserAnalysis, {
      userId: args.userId,
      commentId: args.commentId,
    });
    
    if (existingAnalysis) {
      console.log(`Analysis already exists for user ${args.userId} and comment ${args.commentId}`);
      return existingAnalysis;
    }
    
    try {
      console.log(`Analyzing job fit for comment ${args.commentId} and user ${args.userId}`);
      
      // Call external LLM API for job analysis (HackerNews-specific)
      const analysis: JobAnalysis = await analyzeHackerNewsJob(comment.text, args.resumeText, args.preferences);
      
      console.log(`Job analysis complete for comment ${args.commentId}: ${analysis.recommendation}`);
      
      // Save the analysis to database
      const savedAnalysis: Doc<"hackernews_analyses"> = await ctx.runMutation(api.hackernews.saveJobAnalysis, {
        userId: args.userId,
        commentId: args.commentId,
        threadId: comment.threadId,
        analysis: analysis,
      });
      
      return savedAnalysis;
      
    } catch (error) {
      console.error(`Job analysis failed for comment ${args.commentId}:`, error);
      throw error;
    }
  },
});

// Mutation to save job analysis results
export const saveJobAnalysis = mutation({
  args: {
    userId: v.string(),
    commentId: v.id("hackernews_comments"),
    threadId: v.string(),
    analysis: v.any(), // JobAnalysis object
  },
  handler: async (ctx, args): Promise<Doc<"hackernews_analyses">> => {
    const now = Date.now();
    
    // Create analysis record
    const analysisId: Id<"hackernews_analyses"> = await ctx.db.insert("hackernews_analyses", {
      userId: args.userId,
      commentId: args.commentId,
      threadId: args.threadId,
      recommendation: args.analysis.recommendation,
      fitScore: args.analysis.fitScore,
      confidence: args.analysis.confidence,
      jobSummary: args.analysis.job_summary,
      fitSummary: args.analysis.fit_summary,
      companySummary: args.analysis.company_summary,
      whyGoodFit: args.analysis.why_good_fit,
      potentialConcerns: args.analysis.potential_concerns,
      summary: args.analysis.summary,
      analysis: args.analysis.analysis,
      createdAt: now,
    });
    
    // Return the created analysis
    const result = await ctx.db.get(analysisId);
    if (!result) {
      throw new Error("Failed to create analysis record");
    }
    return result;
  },
});

// Query to get a specific user's analysis for a comment
export const getUserAnalysis = query({
  args: {
    userId: v.string(),
    commentId: v.id("hackernews_comments"),
  },
  handler: async (ctx, args): Promise<Doc<"hackernews_analyses"> | null> => {
    return await ctx.db
      .query("hackernews_analyses")
      .withIndex("by_user_and_comment", (q) => 
        q.eq("userId", args.userId).eq("commentId", args.commentId)
      )
      .first();
  },
});

// Query to get all user analyses for a thread
export const getUserAnalysesForThread = query({
  args: {
    userId: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"hackernews_analyses">[]> => {
    return await ctx.db
      .query("hackernews_analyses")
      .withIndex("by_user_and_thread", (q) => 
        q.eq("userId", args.userId).eq("threadId", args.threadId)
      )
      .collect();
  },
});

// Helper query to get a comment by ID
export const getCommentById = query({
  args: {
    commentId: v.id("hackernews_comments"),
  },
  handler: async (ctx, args): Promise<Doc<"hackernews_comments"> | null> => {
    return await ctx.db.get(args.commentId);
  },
});

