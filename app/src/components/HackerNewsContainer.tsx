"use client";

import { useState, useEffect } from 'react';
import HNHiringThreadsInput from './HNHiringThreadsInput';
import HackerNewsJobs from './HackerNewsJobs';

interface HackerNewsContainerProps {
  userId: string;
  resumeText: string;
  preferences: string;
}

const SELECTED_THREAD_KEY = 'hn-selected-thread-id';

export default function HackerNewsContainer({ 
  userId, 
  resumeText, 
  preferences 
}: HackerNewsContainerProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [manualThreadId, setManualThreadId] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Load selected thread from localStorage on mount
  useEffect(() => {
    const savedThreadId = localStorage.getItem(SELECTED_THREAD_KEY);
    if (savedThreadId) {
      setSelectedThreadId(savedThreadId);
    }
  }, []);

  // Save selected thread to localStorage whenever it changes
  useEffect(() => {
    if (selectedThreadId) {
      localStorage.setItem(SELECTED_THREAD_KEY, selectedThreadId);
    }
  }, [selectedThreadId]);

  const handleThreadChange = (threadId: string) => {
    setSelectedThreadId(threadId);
    // Hide manual input when a thread is selected from dropdown
    if (threadId && showManualInput) {
      setShowManualInput(false);
      setManualThreadId('');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualThreadId.trim()) {
      setSelectedThreadId(manualThreadId.trim());
      setShowManualInput(false);
    }
  };

  const handleShowManualInput = () => {
    setShowManualInput(true);
    setSelectedThreadId(''); // Clear dropdown selection
  };

  return (
    <div className="space-y-6">
      {/* Thread Selection */}
      <div className="space-y-4">
        <HNHiringThreadsInput
          selectedThreadId={selectedThreadId}
          onChangeSelectedThread={handleThreadChange}
        />

        {/* Manual Thread ID Input - Show after error or on user request */}
        {showManualInput && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label htmlFor="manual-thread" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Thread ID Manually
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Find a "Who is hiring?" thread on HackerNews and copy the ID from the URL
                </p>
                <div className="flex space-x-2">
                  <input
                    id="manual-thread"
                    type="text"
                    value={manualThreadId}
                    onChange={(e) => setManualThreadId(e.target.value)}
                    placeholder="e.g., 41902125"
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!manualThreadId.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                  >
                    Use Thread
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Show manual input option if no thread selected and not already showing manual input */}
        {!selectedThreadId && !showManualInput && (
          <div className="text-center">
            <button
              onClick={handleShowManualInput}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Or enter a thread ID manually
            </button>
          </div>
        )}
      </div>

      {/* Jobs Display - Only show if thread is selected */}
      {selectedThreadId && (
        <HackerNewsJobs
          threadId={selectedThreadId}
          userId={userId}
          resumeText={resumeText}
          preferences={preferences}
        />
      )}
    </div>
  );
}