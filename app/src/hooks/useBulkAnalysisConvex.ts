import { useQuery, useMutation, useAction } from "convex/react";
import { useCallback } from "react";
import { api } from "../../convex/_generated/api";

export interface UseBulkAnalysisConvexReturn {
  session: any | null;
  progress: {
    totalJobs: number;
    completedJobs: number;
    remainingJobs: number;
  } | null;
  isProcessing: boolean;
  loading: boolean;
  startAnalysis: (threadId: string, userId: string, resumeText: string, preferences: string) => void;
  pauseAnalysis: (userId: string) => void;
  resumeAnalysis: (userId: string, threadId: string, resumeText: string, preferences: string) => void;
}

export const useBulkAnalysisConvex = (threadId: string, userId: string): UseBulkAnalysisConvexReturn => {
  // Query to get bulk analysis progress
  const progressData = useQuery(api.bulkAnalysis.getBulkAnalysisProgress, 
    threadId && userId ? { threadId, userId } : "skip"
  );
  
  // Actions and Mutations
  const startAnalysisAction = useAction(api.bulkAnalysis.startBulkAnalysis);
  const pauseAnalysisMutation = useMutation(api.bulkAnalysis.pauseBulkAnalysis);
  
  const loading = progressData === undefined;
  const session = progressData?.session || null;
  const isProcessing = progressData?.isProcessingCurrentThread || false;
  
  const progress = progressData ? {
    totalJobs: progressData.totalJobs,
    completedJobs: progressData.completedJobs,
    remainingJobs: progressData.remainingJobs,
  } : null;
  
  const startAnalysis = useCallback(async (threadId: string, userId: string, resumeText: string, preferences: string) => {
    try {
      console.log(`Starting bulk analysis for thread ${threadId} and user ${userId}`);
      const result = await startAnalysisAction({ threadId, userId, resumeText, preferences });
      console.log("Bulk analysis started:", result);
    } catch (err) {
      console.error("Error starting bulk analysis:", err);
    }
  }, [startAnalysisAction]);
  
  const pauseAnalysis = useCallback(async (userId: string) => {
    try {
      const result = await pauseAnalysisMutation({ userId });
      console.log("Bulk analysis paused:", result);
    } catch (err) {
      console.error("Error pausing bulk analysis:", err);
    }
  }, [pauseAnalysisMutation]);
  
  const resumeAnalysis = useCallback(async (userId: string, threadId: string, resumeText: string, preferences: string) => {
    // Just use startAnalysis - it handles both new and existing sessions
    return await startAnalysis(threadId, userId, resumeText, preferences);
  }, [startAnalysis]);
  
  return {
    session,
    progress,
    isProcessing,
    loading,
    startAnalysis,
    pauseAnalysis,
    resumeAnalysis,
  };
};