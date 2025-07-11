import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  hackernews_threads: defineTable({
    threadId: v.string(),
    title: v.string(),
    author: v.string(),
    time: v.number(),
    url: v.optional(v.string()),
    processingStatus: v.union(
      v.literal("idle"),
      v.literal("fetching"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("paused")
    ),
    totalComments: v.number(),
    processedComments: v.number(),
    requestsInCurrentMinute: v.number(),
    currentMinuteStart: v.number(),
    maxRequestsPerMinute: v.number(),
    lastFetched: v.number(),
    lastProcessedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_processingStatus", ["processingStatus"])
    .index("by_createdAt", ["createdAt"]),

  hackernews_comments: defineTable({
    commentId: v.string(),
    threadId: v.string(),
    author: v.string(),
    text: v.string(),
    time: v.number(),
    processingStatus: v.union(
      v.literal("unprocessed"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    processingAttempts: v.number(),
    processingErrors: v.optional(v.array(v.string())),
    lastAttemptAt: v.optional(v.number()),
    jobData: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_commentId", ["commentId"])
    .index("by_threadId", ["threadId"])
    .index("by_thread_and_status", ["threadId", "processingStatus"])
    .index("by_thread_status_time", ["threadId", "processingStatus", "time"]),

  hackernews_analyses: defineTable({
    userId: v.string(),
    commentId: v.id("hackernews_comments"),
    threadId: v.string(),
    recommendation: v.union(
      v.literal("apply"),
      v.literal("maybe"),
      v.literal("skip")
    ),
    fitScore: v.number(),
    confidence: v.number(),
    fitSummary: v.string(),
    whyGoodFit: v.array(v.string()),
    potentialConcerns: v.array(v.string()),
    analysis: v.optional(v.string()),
    createdAt: v.number(),
    // Legacy fields for backward compatibility with existing data
    companySummary: v.optional(v.any()),
    jobSummary: v.optional(v.string()),
    summary: v.optional(v.any()),
  })
    .index("by_user_and_comment", ["userId", "commentId"])
    .index("by_user_and_thread", ["userId", "threadId"])
    .index("by_commentId", ["commentId"])
    .index("by_threadId", ["threadId"]),

  bulk_analysis_sessions: defineTable({
    userId: v.string(),
    threadId: v.string(),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("paused")
    ),
    resumeText: v.string(),
    preferences: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    lastProcessedAt: v.optional(v.number()),
    requestsInCurrentMinute: v.number(),
    currentMinuteStart: v.number(),
    maxRequestsPerMinute: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_and_thread", ["userId", "threadId"]),
});