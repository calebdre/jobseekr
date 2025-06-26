"use client";

import { useEffect } from "react";
import { useSearchSession } from "@/hooks/useSearchSession";
import { useUserData } from "@/hooks/useUserData";
import { useJobSearch } from "@/hooks/useJobSearch";
import { useJobResults } from "@/hooks/useJobResults";
import JobCard from "@/components/JobCard";

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
    setIsSearching,
    setProgress,
    setSearchComplete,
    setActiveSearchSession,
    handleSubmit,
    handleCancelSearch,
    handleFileUpload,
    fileInputRef,
  } = useJobSearch({
    userId,
    onSearchComplete: refreshJobResults,
    onJobResult: (job) => setJobResults(prev => [...prev, job]),
    onJobSkipped: () => {}, // Already handled in useJobSearch
  });

  // Initialize data on component mount
  useEffect(() => {
    if (userId) {
      initializeJobData(setActiveSearchSession, setIsSearching, setProgress, setSearchComplete);
    }
  }, [userId, initializeJobData, setActiveSearchSession, setIsSearching, setProgress, setSearchComplete]);

  // Real-time search session subscription
  const { cancelSubscription } = useSearchSession({
    userId,
    enabled: !!activeSearchSession,
    onProgressUpdate: (progress) => {
      setProgress(progress);
    },
    onStatusChange: (status) => {
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
      }
    }
  });

  // Enhanced handleSubmit that resets job results before search
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJobResults([]); // Clear previous results
    await handleSubmit(resumeText, preferences, jobTitle);
  };

  // Enhanced cancel that includes subscription cleanup
  const handleFormCancelSearch = async () => {
    await handleCancelSearch();
    cancelSubscription();
  };

  const preferencesPlaceholder = `Looking for remote software engineering roles, preferably full-stack or frontend positions. Open to $80k-120k salary range. Interested in startups or mid-size companies with good work-life balance. No interest in finance or insurance industries.`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Job Search Setup
          </h1>
          
          <form onSubmit={handleFormSubmit} className="space-y-8">
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
              <p className="text-sm text-gray-500 mb-3 max-w-lg">
                Copy and paste your resume content, or upload a PDF file. Include your experience, skills, education, and any relevant background.
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
              
              {/* Helpful message when resume has content */}
              {resumeText.length > 50 && (
                <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Perfect! Our AI can understand any format - no need to worry about structure, bullet points, or formatting.
                  </span>
                </div>
              )}
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

            {/* Submit Button */}
            <div className="flex justify-center gap-4">
              <button
                type="submit"
                disabled={isSearching || !!activeSearchSession}
                className={`font-medium py-3 px-8 rounded-lg transition-colors duration-200 text-lg ${
                  isSearching || activeSearchSession
                    ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSearching ? 'Searching...' : 'Start Job Search'}
              </button>
              
              {(isSearching || activeSearchSession) && (
                <button
                  type="button"
                  onClick={handleFormCancelSearch}
                  className="font-medium py-3 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 text-lg"
                >
                  Cancel Search
                </button>
              )}
            </div>
          </form>

          {/* Reconnection Message */}
          {activeSearchSession && !isSearching && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Search in Progress</h3>
              <p className="text-blue-700 mb-4">
                You have an active search for &quot;{activeSearchSession.jobTitle}&quot; that started at{' '}
                {new Date(activeSearchSession.createdAt).toLocaleTimeString()}.
              </p>
              <p className="text-blue-700 text-sm">
                Real-time updates will appear below as the search progresses.
              </p>
            </div>
          )}

          {/* Progress Section */}
          {(isSearching || (activeSearchSession && progress.total > 0)) && (
            <div className="mt-8 bg-blue-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Search Progress</h2>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' 
                    }}
                  ></div>
                </div>
              </div>
              
              {/* Status */}
              <p className="text-gray-700">{progress.status}</p>
            </div>
          )}

          {/* Job Results */}
          {jobResults.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Job Analysis Results</h2>
                <div className="text-sm text-gray-600">
                  Showing {filteredJobs.length} of {jobResults.length} jobs
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
                {[
                  { key: 'all', label: 'All Jobs', count: jobResults.length },
                  { key: 'to_apply', label: 'To Apply', count: jobResults.filter(j => j.status === 'unread' && j.recommendation === 'apply').length },
                  { key: 'unread', label: 'Unread', count: jobResults.filter(j => j.status === 'unread').length },
                  { key: 'applied', label: 'Applied', count: jobResults.filter(j => j.status === 'applied').length },
                  { key: 'saved_for_later', label: 'Saved', count: jobResults.filter(j => j.status === 'saved_for_later').length },
                  { key: 'not_interested', label: 'Not Interested', count: jobResults.filter(j => j.status === 'not_interested').length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      statusFilter === tab.key
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
              
              <div className="space-y-6">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onUpdateStatus={updateJobStatus}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Skipped Jobs Section */}
          {skippedJobs.length > 0 && (
            <div className="mt-8">
              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer text-gray-700 font-medium">
                  Skipped Jobs ({skippedJobs.length})
                </summary>
                <div className="mt-4 space-y-2">
                  {skippedJobs.map((job, index) => (
                    <div key={index} className="text-sm text-gray-600 border-l-2 border-gray-300 pl-3">
                      <strong>{job.title}</strong> at {job.company} - {job.reason}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Completion Message */}
          {searchComplete && (
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Search Complete!</h3>
              <p className="text-green-700">
                Found {jobResults.length} job{jobResults.length !== 1 ? 's' : ''} to analyze.
                {jobResults.filter(job => job.recommendation === 'apply').length > 0 && (
                  <span className="block mt-1 font-medium">
                    🎯 {jobResults.filter(job => job.recommendation === 'apply').length} job{jobResults.filter(job => job.recommendation === 'apply').length !== 1 ? 's' : ''} recommended for application!
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}