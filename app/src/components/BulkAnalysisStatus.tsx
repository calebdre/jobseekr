import { useBulkAnalysisConvex } from '@/hooks/useBulkAnalysisConvex';
import { Tooltip } from '@mantine/core';

interface BulkAnalysisStatusProps {
  threadId: string;
  userId: string;
  resumeText: string;
  preferences: string;
}

export default function BulkAnalysisStatus({ 
  threadId,
  userId,
  resumeText,
  preferences
}: BulkAnalysisStatusProps) {
  const {
    session,
    progress,
    isProcessing,
    loading,
    startAnalysis,
    pauseAnalysis,
    resumeAnalysis,
  } = useBulkAnalysisConvex(threadId, userId);
  if (loading) return null;
  if (!progress) return null;

  const isComplete = progress.remainingJobs === 0;
  const hasStarted = progress.completedJobs > 0;
  
  // Check if both resume and preferences are provided
  const hasResume = resumeText?.trim().length > 0;
  const hasPreferences = preferences?.trim().length > 0;
  const canStartAnalysis = hasResume && hasPreferences;
  
  // Generate tooltip message for disabled state
  const getDisabledMessage = () => {
    if (!hasResume && !hasPreferences) return "Please provide both resume and job preferences to start analysis";
    if (!hasResume) return "Please provide your resume to start analysis";
    if (!hasPreferences) return "Please provide your job preferences to start analysis";
    return "";
  };
  
  const getStatusText = () => {
    if (isProcessing) return "Analyzing job fit...";
    if (isComplete) return "Analysis complete";
    if (hasStarted && !isProcessing) return "Analysis paused";
    return "Ready to analyze job fit";
  };
  
  const getStatusColor = () => {
    if (isProcessing) return "bg-purple-50";
    if (isComplete) return "bg-green-50";
    if (hasStarted && !isProcessing) return "bg-yellow-50";
    return "bg-gray-50";
  };
  
  const getProgressBarColor = () => {
    if (isProcessing) return "bg-purple-600";
    if (isComplete) return "bg-green-600";
    if (hasStarted && !isProcessing) return "bg-yellow-600";
    return "bg-gray-600";
  };

  return (
    <div className={`mt-4 p-3 rounded ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-800">
          {getStatusText()}
        </span>
        <span className="text-sm text-gray-600">
          {progress.completedJobs} / {progress.totalJobs} analyzed
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div 
          className={`h-2 rounded-full ${getProgressBarColor()}`}
          style={{ width: `${progress.totalJobs > 0 ? (progress.completedJobs / progress.totalJobs) * 100 : 0}%` }}
        ></div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        {isProcessing && (
          <button
            onClick={() => pauseAnalysis(userId)}
            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Pause Analysis
          </button>
        )}
        
        {hasStarted && !isProcessing && !isComplete && (
          <button
            onClick={() => resumeAnalysis(userId, threadId, resumeText, preferences)}
            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Resume Analysis
          </button>
        )}
        
        {!hasStarted && !isProcessing && (
          <Tooltip
            label={!canStartAnalysis ? getDisabledMessage() : "Start analyzing job fit for all jobs"}
            disabled={canStartAnalysis}
          >
            <button
              onClick={() => startAnalysis(threadId, userId, resumeText, preferences)}
              disabled={!canStartAnalysis}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                canStartAnalysis
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Start Job Analysis
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}