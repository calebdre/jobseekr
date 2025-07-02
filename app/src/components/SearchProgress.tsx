import { SearchProgress as SearchProgressType, SearchSession } from "@/types";

interface SearchProgressProps {
  progress: SearchProgressType;
  activeSearchSession: SearchSession | null;
  onResumeSearch: () => void;
}

export default function SearchProgressUI({ 
  progress, 
  activeSearchSession, 
  onResumeSearch 
}: SearchProgressProps) {
  // Helper function to determine if progress bar should be shown
  const shouldShowProgressBar = () => {
    if (!activeSearchSession || progress.total <= 0) return false;
    
    // Check if session is expired (48 hours)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const sessionDate = new Date(activeSearchSession.createdAt);
    return sessionDate >= fortyEightHoursAgo;
  };

  // Helper function to get progress bar styling
  const getProgressBarStyle = () => {
    switch (activeSearchSession?.status) {
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-green-600';
      default: return 'bg-blue-600';
    }
  };

  if (!shouldShowProgressBar()) {
    return null;
  }

  return (
    <div className={`mt-8 rounded-lg p-6 ${
      activeSearchSession?.status === 'paused' ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50'
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Job Search Progress</h2>
        {activeSearchSession?.status === 'paused' && (
          <div className="flex items-center text-yellow-700">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Paused</span>
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{progress.current} / {progress.total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`${getProgressBarStyle()} h-2 rounded-full transition-all duration-300`}
            style={{ 
              width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' 
            }}
          ></div>
        </div>
      </div>
      
      {/* Status */}
      <div className="flex justify-between items-center">
        <p className="text-gray-700">{progress.status}</p>
        {activeSearchSession?.status === 'paused' && (
          <button
            onClick={onResumeSearch}
            className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors duration-200"
          >
            Resume
          </button>
        )}
      </div>
    </div>
  );
}