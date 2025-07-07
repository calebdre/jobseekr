import { useQuery, useMutation, useAction } from "convex/react";
import { useEffect, useRef, useCallback } from "react";
import { api } from "../../convex/_generated/api";

export interface UseHackernewsThreadsConvexReturn {
  thread: any | null;
  comments: any[];
  loading: boolean;
  error: string | null;
  fetchThread: (threadId: string) => void;
  startProcessing: (threadId: string) => void;
  pauseProcessing: (threadId: string) => void;
  resumeProcessing: (threadId: string) => void;
  isProcessing: boolean;
  progress: {
    current: number;
    total: number;
  } | null;
  isFetching: boolean;
}

export const useHackernewsThreadsConvex = (threadId: string): UseHackernewsThreadsConvexReturn => {
  // Track if we've attempted to fetch this thread
  const fetchedThreads = useRef<Set<string>>(new Set());
  // Track threads currently being fetched
  const fetchingThreads = useRef<Set<string>>(new Set());
  
  // Query to get thread with comments
  const data = useQuery(api.hackernews.getThreadWithComments, 
    threadId ? { threadId } : "skip"
  );
  
  // Actions and Mutations
  const fetchThreadAction = useAction(api.hackernews.fetchHackerNewsThread);
  const checkAndStartProcessingMutation = useMutation(api.hackernews.checkAndStartProcessing);
  const startProcessingMutation = useMutation(api.hackernews.startProcessing);
  const pauseProcessingMutation = useMutation(api.hackernews.pauseProcessing);
  const resumeProcessingMutation = useMutation(api.hackernews.resumeProcessing);
  
  const loading = data === undefined;
  const isFetching = fetchingThreads.current.has(threadId);
  const error = data === null && fetchedThreads.current.has(threadId) && !isFetching ? "Thread not found or failed to load" : null;
  
  const fetchThread = useCallback(async (threadId: string) => {
    try {
      console.log(`Fetching thread ${threadId} from HackerNews...`);
      fetchingThreads.current.add(threadId);
      await fetchThreadAction({ threadId });
      console.log(`Successfully fetched thread ${threadId}`);
    } catch (err) {
      console.error("Error fetching thread:", err);
    } finally {
      fetchingThreads.current.delete(threadId);
    }
  }, [fetchThreadAction]);

  // Auto-fetch thread if it doesn't exist in the database
  useEffect(() => {
    if (threadId && data === null && !fetchedThreads.current.has(threadId)) {
      console.log(`Thread ${threadId} not found in database, fetching from HackerNews...`);
      fetchedThreads.current.add(threadId);
      fetchThread(threadId);
    }
  }, [threadId, data, fetchThread]);

  // Check and start processing for idle threads with unprocessed comments
  useEffect(() => {
    if (data?.thread && threadId) {
      const thread = data.thread;
      const comments = data.comments || [];
      
      // Only check for idle threads
      if (thread.processingStatus === "idle") {
        const unprocessedCount = comments.filter((c: any) => c.processingStatus === "unprocessed").length;
        
        if (unprocessedCount > 0) {
          console.log(`Hook detected idle thread ${threadId} with ${unprocessedCount} unprocessed comments, triggering check`);
          checkAndStartProcessingMutation({ threadId });
        }
      }
    }
  }, [data, threadId, checkAndStartProcessingMutation]);
  
  const startProcessing = async (threadId: string) => {
    try {
      const result = await startProcessingMutation({ threadId });
      console.log("Processing started:", result);
    } catch (err) {
      console.error("Error starting processing:", err);
    }
  };
  
  const pauseProcessing = async (threadId: string) => {
    try {
      const result = await pauseProcessingMutation({ threadId });
      console.log("Processing paused:", result);
    } catch (err) {
      console.error("Error pausing processing:", err);
    }
  };
  
  const resumeProcessing = async (threadId: string) => {
    try {
      const result = await resumeProcessingMutation({ threadId });
      console.log("Processing resumed:", result);
    } catch (err) {
      console.error("Error resuming processing:", err);
    }
  };
  
  // Calculate processing status
  const thread = data?.thread || null;
  const comments = data?.comments || [];
  const isProcessing = thread?.processingStatus === "processing" || thread?.processingStatus === "fetching";
  
  const progress = thread ? {
    current: thread.processedComments || 0,
    total: thread.totalComments || 0,
  } : null;
  
  return {
    thread,
    comments,
    loading,
    error,
    fetchThread,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    isProcessing,
    progress,
    isFetching,
  };
};