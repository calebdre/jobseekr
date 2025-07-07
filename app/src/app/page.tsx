"use client";

import { useEffect, useCallback } from "react";
import { useSearchSession } from "@/hooks/useSearchSession";
import { useUserData } from "@/hooks/useUserData";
import { useJobSearch } from "@/hooks/useJobSearch";
import { useJobResults } from "@/hooks/useJobResults";
import { JobStatus, ProcessedJob, SearchProgress } from "@/types";
import HackerNewsContainer from "@/components/HackerNewsContainer";
import { ConvexProvider, ConvexReactClient } from "convex/react";
// import JobListing from "@/components/JobListing";
const convexClient = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_DEV_URL!);
export default function Home() {
  // User data and localStorage management
  const {
    userId,
    resumeText,
    preferences,
    jobTitle,
    handleResumeChange,
    handlePreferencesChange,
    handleJobTitleChange,
  } = useUserData();

  // Job results management
  const {
    jobResults,
    statusFilter,
    filteredJobs,
    setJobResults,
    setStatusFilter,
    refreshJobResults,
    updateJobStatus,
    initializeJobData,
  } = useJobResults({ userId });

  // Job search functionality
  const {
    isSearching,
    progress,
    skippedJobs,
    searchComplete,
    activeSearchSession,
    batchComplete,
    batchInfo,
    resultsChangedNotification,
    setIsSearching,
    setProgress,
    setSearchComplete,
    setActiveSearchSession,
    handleSubmit,
    handleContinueSearch,
    handleStopBatch,
    dismissResultsChangedNotification,
    handlePauseSearch,
    handleResumeSearch,
    handleFileUpload,
    fileInputRef,
  } = useJobSearch({
    userId,
    onSearchComplete: refreshJobResults,
    onJobResult: (job: ProcessedJob) => setJobResults(prev => [...prev, job]),
  });

  // Initialize data on component mount
  useEffect(() => {
    if (userId) {
      initializeJobData(setActiveSearchSession, setIsSearching, setProgress, setSearchComplete);
    }
  }, [userId, initializeJobData, setActiveSearchSession, setIsSearching, setProgress, setSearchComplete]);

  // Memoize callbacks to prevent infinite re-renders
  const handleProgressUpdate = useCallback((progress: SearchProgress) => {
    setProgress(progress);
  }, [setProgress]);

  const handleStatusChange = useCallback((status: string) => {
    console.log('Search status changed to:', status);
    if (status === 'completed') {
      setIsSearching(false);
      setSearchComplete(true);
      setActiveSearchSession(null);
      // Refresh job results
      refreshJobResults();
    } else if (status === 'failed') {
      setIsSearching(false);
      setActiveSearchSession(null);
      alert('Search failed. Please try again.');
    } else if (status === 'paused') {
      setIsSearching(false);
      // Keep activeSearchSession for resume functionality
      console.log('Search paused, session preserved for resume');
    }
  }, [setIsSearching, setSearchComplete, setActiveSearchSession, refreshJobResults]);

  // Real-time search session subscription
  useSearchSession({
    userId,
    enabled: !!activeSearchSession,
    onProgressUpdate: handleProgressUpdate,
    onStatusChange: handleStatusChange
  });

  // Enhanced handleSubmit that preserves existing job results during search
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(resumeText, preferences, jobTitle);
  };

  // Enhanced pause that includes subscription cleanup
  const handleFormPauseSearch = async () => {
    await handlePauseSearch();
    // Note: Don't cancel subscription for paused state - keep it active for resume updates
  };

  // Resume search with current form values
  const handleFormResumeSearch = async () => {
    await handleResumeSearch(resumeText, preferences, jobTitle);
  };

  const preferencesPlaceholder = `Looking for remote software engineering roles, preferably full-stack or frontend positions. Open to $80k-120k salary range. Interested in startups or mid-size companies with good work-life balance. No interest in finance or insurance industries.`;

  // Helper function to get button state
  const getButtonState = () => {
    if (isSearching) return 'searching';
    if (activeSearchSession?.status === 'paused') return 'paused';
    if (activeSearchSession?.status === 'in_progress') return 'active';
    return 'idle';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Job Search Setup
          </h1>
          
          <form 
            // onSubmit={handleFormSubmit} 
            className="space-y-8"
          >
            {/* Job Title Section */}
            <div>
              <label htmlFor="jobTitle" className="block text-lg font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <p className="text-sm text-gray-500">
                What type of job are you looking for?
              </p>
              <p className="text-sm text-gray-500 mb-3">
              This will be used to search for relevant positions.
              </p>
              <input
                id="jobTitle"
                type="text"
                value={jobTitle}
                onChange={(e) => handleJobTitleChange(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Software Engineer, Product Manager, Data Scientist"
              />
            </div>

            {/* Resume Section */}
            <div className="relative">
              <label htmlFor="resume" className="block text-lg font-medium text-gray-700 mb-1">
                Resume
              </label>
              <p className="text-sm text-gray-500 max-w-lg">
                Copy and paste your resume content, or upload a PDF file. Include your experience, skills, education, and any relevant background.
              </p>
              <p className="text-sm text-gray-500 mb-3 max-w-lg">
                Don't worry about formatting - the AI will handle it.
              </p>
              <textarea
                id="resume"
                value={resumeText}
                onChange={(e) => handleResumeChange(e.target.value)}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Paste your resume here or upload a PDF file..."
              />
              
              {/* Floating Upload Button */}
              {!resumeText.trim() && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 ease-in-out opacity-80 hover:opacity-100 shadow-lg"
                >
                  Upload PDF
                </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileUpload(e, handleResumeChange)}
                className="hidden"
              />
            </div>

            {/* Preferences Section */}
            <div>
              <label htmlFor="preferences" className="block text-lg font-medium text-gray-700 mb-1">
                Job Preferences
              </label>
              <p className="text-sm text-gray-500 mb-3 max-w-lg">
                Describe your ideal job: role types, salary range, location preferences, company size, work style (remote/hybrid), and industries you want to avoid.
              </p>
              <textarea
                id="preferences"
                value={preferences}
                onChange={(e) => handlePreferencesChange(e.target.value)}
                className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={preferencesPlaceholder}
              />
            </div>
          </form>

          <div className="h-12" />
          <ConvexProvider client={convexClient}>
            <HackerNewsContainer 
              userId={userId}
              resumeText={resumeText}
              preferences={preferences}
            />
          </ConvexProvider>
          {/* <JobListing
            jobResults={jobResults}
            filteredJobs={filteredJobs}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            updateJobStatus={async (jobId: string, status: string) => {
              await updateJobStatus(jobId, status as JobStatus);
            }}
            progress={progress} 
            activeSearchSession={activeSearchSession}
            isSearching={isSearching}
            searchComplete={searchComplete}
            batchComplete={batchComplete}
            batchInfo={batchInfo}
            skippedJobs={skippedJobs}
            resultsChangedNotification={resultsChangedNotification}
            jobTitle={jobTitle}
            onResumeSearch={handleFormResumeSearch}
            onContinueSearch={() => handleContinueSearch(resumeText, preferences, jobTitle)}
            onStopBatch={handleStopBatch}
            onDismissNotification={dismissResultsChangedNotification}
          /> */}
        </div>
      </div>
    </div>
  );
}

