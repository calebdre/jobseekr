interface ProcessingStatusProps {
  thread: any;
  isProcessing: boolean;
  progress: {
    current: number;
    total: number;
  } | null;
  onStartProcessing: () => void;
  onPauseProcessing: () => void;
  onResumeProcessing: () => void;
}

export default function ProcessingStatus({ 
  thread, 
  isProcessing, 
  progress, 
  onStartProcessing, 
  onPauseProcessing, 
  onResumeProcessing 
}: ProcessingStatusProps) {
  if (!progress) return null;

  const isComplete = progress.current >= progress.total;
  const isIdle = thread.processingStatus === "idle";
  const isPaused = thread.processingStatus === "paused";
  
  const getStatusText = () => {
    if (isProcessing) return "Processing comments...";
    if (isComplete) return "Processing complete";
    if (isPaused) return "Processing paused";
    if (isIdle && progress.current === 0) return "Ready to start processing";
    if (isIdle && progress.current > 0) return "Processing stopped";
    if (thread.processingStatus === "completed") return "Processing complete";
    return "Processing status unknown";
  };
  
  const getStatusColor = () => {
    if (isProcessing) return "bg-blue-50";
    if (isComplete) return "bg-green-50";
    if (isPaused) return "bg-yellow-50";
    return "bg-gray-50";
  };
  
  const getProgressBarColor = () => {
    if (isProcessing) return "bg-blue-600";
    if (isComplete) return "bg-green-600";
    if (isPaused) return "bg-yellow-600";
    return "bg-gray-600";
  };

  return (
    <div className={`mt-4 p-3 rounded ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-800">
          {getStatusText()}
        </span>
        <span className="text-sm text-gray-600">
          {progress.current} / {progress.total}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div 
          className={`h-2 rounded-full ${getProgressBarColor()}`}
          style={{ width: `${(progress.current / progress.total) * 100}%` }}
        ></div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        {isProcessing && (
          <button
            onClick={onPauseProcessing}
            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Pause Processing
          </button>
        )}
        
        {isPaused && (
          <button
            onClick={onResumeProcessing}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Resume Processing
          </button>
        )}
        
        {(isIdle && !isComplete) && (
          <button
            onClick={onStartProcessing}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            {progress.current === 0 ? "Start Processing" : "Resume Processing"}
          </button>
        )}
      </div>
    </div>
  );
}