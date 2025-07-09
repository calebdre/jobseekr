import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// Query to get bulk analysis session for a user
export const getBulkAnalysisSession = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"bulk_analysis_sessions"> | null> => {
    return await ctx.db
      .query("bulk_analysis_sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Query to get bulk analysis progress for a specific thread
export const getBulkAnalysisProgress = query({
  args: {
    userId: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user's bulk analysis session
    const session = await ctx.db
      .query("bulk_analysis_sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    // Get all valid job comments for this thread
    const validComments = await ctx.db
      .query("hackernews_comments")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .filter((q) => q.eq(q.field("processingStatus"), "completed"))
      .collect();
    
      
    // Filter to only valid job postings
    // const validJobComments = validComments.filter(comment => 
    //   comment.jobData?.isValidJobPosting === true
    // );
    
    // Get existing analyses for this user/thread
    const existingAnalyses = await ctx.db
      .query("hackernews_analyses")
      .withIndex("by_user_and_thread", (q) => 
        q.eq("userId", args.userId).eq("threadId", args.threadId)
      )
      .collect();
    
    return {
      session,
      totalJobs: validComments.length,
      completedJobs: existingAnalyses.length,
      remainingJobs: validComments.length - existingAnalyses.length,
      isProcessingCurrentThread: session?.status === "processing" && session?.threadId === args.threadId,
    };
  },
});

// Action to start bulk analysis
export const startBulkAnalysis = action({
  args: {
    threadId: v.string(),
    userId: v.string(),
    resumeText: v.string(),
    preferences: v.string(),
  },
  handler: async (ctx, args) => {
    // Create or update the bulk analysis session
    const a = await ctx.runMutation(api.bulkAnalysis.createOrUpdateSession, {
        threadId: args.threadId,
        userId: args.userId,
        resumeText: args.resumeText,
        preferences: args.preferences,
      });
      
      // Schedule the first analysis
      await ctx.scheduler.runAfter(0, api.bulkAnalysis.processNextBulkAnalysis, {
        sessionId: a,
      });
      
    return a;  
  },
});

// Mutation to create or update bulk analysis session
export const createOrUpdateSession = mutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    resumeText: v.string(),
    preferences: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"bulk_analysis_sessions">> => {
    const now = Date.now();
    
    // Check if session already exists
    const existingSession = await ctx.db
      .query("bulk_analysis_sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    const sessionData = {
      userId: args.userId,
      threadId: args.threadId,
      status: "processing" as const,
      resumeText: args.resumeText,
      preferences: args.preferences,
      startedAt: now,
      completedAt: undefined,
      lastProcessedAt: now,
      requestsInCurrentMinute: 0,
      currentMinuteStart: Math.floor(now / 60000) * 60000,
      maxRequestsPerMinute: 20, // Same as job processing
    };
    
    if (existingSession) {
      // Update existing session
      await ctx.db.patch(existingSession._id, sessionData);
      return existingSession._id;
    } else {
      // Create new session
      return await ctx.db.insert("bulk_analysis_sessions", sessionData);
    }
  },
});

// Mutation to process next bulk analysis (sequential processing)
export const processNextBulkAnalysis = mutation({
  args: {
    sessionId: v.id("bulk_analysis_sessions"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get session and check if still processing
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "processing") {
      console.log(`Bulk analysis session ${args.sessionId} is not processing`);
      return { status: "cancelled" };
    }
    
    // Check if processing is paused
    if (session.status === "paused") {
      console.log(`Bulk analysis session ${args.sessionId} is paused`);
      return { status: "paused" };
    }
    
    // Check rate limiting (same logic as job processing)
    const currentMinute = Math.floor(now / 60000) * 60000;
    const isNewMinute = currentMinute > session.currentMinuteStart;
    
    if (isNewMinute) {
      // Reset rate limiting for new minute
      await ctx.db.patch(args.sessionId, {
        currentMinuteStart: currentMinute,
        requestsInCurrentMinute: 0,
      });
    } else if (session.requestsInCurrentMinute >= session.maxRequestsPerMinute) {
      // Rate limit exceeded, schedule retry in next minute
      console.log(`Rate limit exceeded for bulk analysis session ${args.sessionId}, scheduling retry`);
      await ctx.scheduler.runAfter(60000, api.bulkAnalysis.processNextBulkAnalysis, {
        sessionId: args.sessionId,
      });
      return { status: "rate_limited" };
    }
    
    // Get all valid job comments for the current thread
    const validComments = await ctx.db
      .query("hackernews_comments")
      .withIndex("by_threadId", (q) => q.eq("threadId", session.threadId))
      .filter((q) => q.eq(q.field("processingStatus"), "completed"))
      .collect();

    
    // Get existing analyses for this user/thread
    const existingAnalyses = await ctx.db
      .query("hackernews_analyses")
      .withIndex("by_user_and_thread", (q) => 
        q.eq("userId", session.userId).eq("threadId", session.threadId)
      )
      .collect();
    
    // Find next comment needing analysis (newest first)
    const nextComment = validComments
      .filter(comment => !existingAnalyses.some(analysis => analysis.commentId === comment._id))
      .sort((a, b) => b.time - a.time)[0];
    
    if (!nextComment) {
      // No more comments to process, mark session as completed
      await ctx.db.patch(args.sessionId, {
        status: "completed",
        completedAt: now,
      });
      console.log(`Bulk analysis completed for session ${args.sessionId}`);
      return { status: "completed" };
    }
    
    // Update session with rate limiting
    await ctx.db.patch(args.sessionId, {
      requestsInCurrentMinute: session.requestsInCurrentMinute + 1,
      lastProcessedAt: now,
    });
    
    console.log(`Scheduling analysis for comment ${nextComment.commentId} in bulk session ${args.sessionId}`);
    
    // Schedule the analysis action
    await ctx.scheduler.runAfter(0, api.bulkAnalysis.processBulkAnalysisItem, {
      sessionId: args.sessionId,
      commentId: nextComment._id,
    });
    
    return { 
      status: "scheduled_analysis",
      commentId: nextComment.commentId,
    };
  },
});

// Mutation to validate bulk analysis item and return session data
export const validateBulkAnalysisItem = mutation({
  args: {
    sessionId: v.id("bulk_analysis_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "processing") {
      return { isValid: false, session: null };
    }
    return { isValid: true, session };
  },
});

// Action to process individual bulk analysis item
export const processBulkAnalysisItem = action({
  args: {
    sessionId: v.id("bulk_analysis_sessions"),
    commentId: v.id("hackernews_comments"),
  },
  handler: async (ctx, args) => {
    try {
      // Validate session
      const validation = await ctx.runMutation(api.bulkAnalysis.validateBulkAnalysisItem, {
        sessionId: args.sessionId,
      });
      
      if (!validation.isValid || !validation.session) {
        console.log(`Bulk analysis session ${args.sessionId} is not processing, skipping`);
        return;
      }
      
      const session = validation.session;
      
      console.log(`Processing bulk analysis for comment ${args.commentId}`);
      
      // Call the existing analyzeCommentJobFit action
      await ctx.runAction(api.hackernews.analyzeCommentJobFit, {
        commentId: args.commentId,
        userId: session.userId,
        resumeText: session.resumeText,
        preferences: session.preferences,
      });
      
      console.log(`Successfully processed bulk analysis for comment ${args.commentId}`);
      
      // Schedule next analysis
      await ctx.runMutation(api.bulkAnalysis.scheduleNextBulkAnalysis, {
        sessionId: args.sessionId,
        success: true,
      });
      
    } catch (error) {
      console.error(`Bulk analysis failed for comment ${args.commentId}:`, error);
      
      // Schedule next analysis even on failure
      await ctx.runMutation(api.bulkAnalysis.scheduleNextBulkAnalysis, {
        sessionId: args.sessionId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});

// Mutation to schedule next bulk analysis
export const scheduleNextBulkAnalysis = mutation({
  args: {
    sessionId: v.id("bulk_analysis_sessions"),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "processing") {
      return;
    }
    
    if (args.success) {
      console.log(`Bulk analysis item succeeded, scheduling next`);
    } else {
      console.log(`Bulk analysis item failed: ${args.error}, continuing with next`);
    }
    
    // Schedule next analysis (with small delay for failed items)
    const delay = args.success ? 0 : 1000;
    await ctx.scheduler.runAfter(delay, api.bulkAnalysis.processNextBulkAnalysis, {
      sessionId: args.sessionId,
    });
  },
});

// Mutation to pause bulk analysis
export const pauseBulkAnalysis = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("bulk_analysis_sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!session) {
      throw new Error(`No bulk analysis session found for user ${args.userId}`);
    }
    
    await ctx.db.patch(session._id, {
      status: "paused",
      lastProcessedAt: Date.now(),
    });
    
    console.log(`Bulk analysis paused for user ${args.userId}`);
    return { status: "paused" };
  },
});