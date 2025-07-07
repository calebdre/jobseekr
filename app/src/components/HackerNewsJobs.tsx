"use client";

import { useHackernewsThreadsConvex } from '@/hooks/useHackernewsThreadsConvex';
import ProcessingStatus from './ProcessingStatus';
import HackerNewsCommentsList from './HackerNewsCommentsList';
import { formatTime } from '@/lib/utils/formatTime';

interface HackerNewsJobsProps {
  threadId: string;
  userId: string;
  resumeText: string;
  preferences: string;
}


export default function HackerNewsJobs({ threadId, userId, resumeText, preferences }: HackerNewsJobsProps) {
  const { 
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
    isFetching
  } = useHackernewsThreadsConvex(threadId);

  // Processing action handlers
  const handleStartProcessing = () => {
    startProcessing(threadId);
  };

  const handlePauseProcessing = () => {
    pauseProcessing(threadId);
  };

  const handleResumeProcessing = () => {
    resumeProcessing(threadId);
  };


  if (loading || isFetching) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-sm text-gray-600">
            {isFetching ? 'Fetching thread from HackerNews...' : 'Loading...'}
          </span>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-800">
          <h3 className="font-medium">Error loading HackerNews jobs</h3>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">No thread data available</p>
        <button 
          onClick={() => fetchThread(threadId)}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Fetch Thread Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Thread Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {thread.title}
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>By {thread.author}</span>
          <span>•</span>
          <span>{formatTime(thread.time)}</span>
          <span>•</span>
          <span>{comments.length} job postings</span>
        </div>
        {thread.url && (
          <a 
            href={thread.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            View original thread →
          </a>
        )}
        
        {/* Processing Status */}
        {isProcessing && (
          <ProcessingStatus 
            thread={thread}
            isProcessing={isProcessing}
            progress={progress}
            onStartProcessing={handleStartProcessing}
            onPauseProcessing={handlePauseProcessing}
            onResumeProcessing={handleResumeProcessing}
          />
        )}
      </div>

      {/* Job Comments */}
      <HackerNewsCommentsList 
        comments={comments} 
        userId={userId}
        resumeText={resumeText}
        preferences={preferences}
        threadId={threadId}
      />
    </div>
  );
}