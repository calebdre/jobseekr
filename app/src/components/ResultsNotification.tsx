import { SearchProgress } from "@/types";

interface ResultsChangedNotification {
  message: string;
}

interface ResultsNotificationProps {
  resultsChangedNotification: ResultsChangedNotification | null;
  progress: SearchProgress;
  jobTitle: string;
  isSearching: boolean;
  onDismiss: () => void;
}

export default function ResultsNotification({ 
  resultsChangedNotification, 
  progress, 
  jobTitle, 
  isSearching, 
  onDismiss 
}: ResultsNotificationProps) {
  const shouldShow = resultsChangedNotification || (progress.total > 0 && !isSearching);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="mt-6">
      {resultsChangedNotification ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Search Results Updated</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {resultsChangedNotification.message}
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-yellow-400 hover:text-yellow-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ) : progress.total > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800">Search Results Available</h4>
              <p className="text-sm text-blue-700">
                Found {progress.total} total job{progress.total !== 1 ? 's' : ''} for "{jobTitle}"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}