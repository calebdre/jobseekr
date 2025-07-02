"use client";

import JobCard from "@/components/JobCard";
import SearchProgressUI from "@/components/SearchProgress";
import BatchComplete from "@/components/BatchComplete";
import SkippedJobs from "@/components/SkippedJobs";
import SearchComplete from "@/components/SearchComplete";
import ResultsNotification from "@/components/ResultsNotification";
import { ProcessedJob, SearchProgress, SearchSession } from "@/types";

interface SkippedJob {
  title: string;
  company: string;
  reason: string;
}

interface BatchInfo {
  message: string;
  batch_processed: number;
  total_processed: number;
  remaining: number;
  total_applied: number;
}

interface ResultsChangedNotification {
  message: string;
}

interface JobListingProps {
  jobResults: ProcessedJob[];
  filteredJobs: ProcessedJob[];
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  updateJobStatus: (jobId: string, status: string) => void;
  
  // Search state props
  progress: SearchProgress;
  activeSearchSession: SearchSession | null;
  isSearching: boolean;
  searchComplete: boolean;
  batchComplete: boolean;
  batchInfo: BatchInfo | null;
  skippedJobs: SkippedJob[];
  resultsChangedNotification: ResultsChangedNotification | null;
  jobTitle: string;
  
  // Callback props
  onResumeSearch: () => void;
  onContinueSearch: () => void;
  onStopBatch: () => void;
  onDismissNotification: () => void;
}

const JobListing: React.FC<JobListingProps> = ({
  jobResults,
  filteredJobs,
  statusFilter,
  setStatusFilter,
  updateJobStatus,
  progress,
  activeSearchSession,
  isSearching,
  searchComplete,
  batchComplete,
  batchInfo,
  skippedJobs,
  resultsChangedNotification,
  jobTitle,
  onResumeSearch,
  onContinueSearch,
  onStopBatch,
  onDismissNotification,
}) => {
  const filterTabs = [
    { key: 'all', label: 'All Jobs', count: jobResults.length },
    { key: 'to_apply', label: 'To Apply', count: jobResults.filter(j => j.status === 'unread' && j.recommendation === 'apply').length },
    { key: 'unread', label: 'Unread', count: jobResults.filter(j => j.status === 'unread').length },
    { key: 'applied', label: 'Applied', count: jobResults.filter(j => j.status === 'applied').length },
    { key: 'saved_for_later', label: 'Saved', count: jobResults.filter(j => j.status === 'saved_for_later').length },
    { key: 'not_interested', label: 'Not Interested', count: jobResults.filter(j => j.status === 'not_interested').length }
  ];

  return (
    <div>
      {/* Results Notification */}
      <ResultsNotification
        resultsChangedNotification={resultsChangedNotification}
        progress={progress}
        jobTitle={jobTitle}
        isSearching={isSearching}
        onDismiss={onDismissNotification}
      />
      
      {/* Progress Section */}
      <SearchProgressUI 
        progress={progress}
        activeSearchSession={activeSearchSession}
        onResumeSearch={onResumeSearch}
      />

      {/* Batch Complete Section */}
      {batchComplete && batchInfo && (
        <BatchComplete
          batchInfo={batchInfo}
          isSearching={isSearching}
          onContinueSearch={onContinueSearch}
          onStopBatch={onStopBatch}
        />
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
            {filterTabs.map(tab => (
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
      <SkippedJobs skippedJobs={skippedJobs} />

      {/* Completion Message */}
      {searchComplete && (
        <SearchComplete jobResults={jobResults} />
      )}
    </div>
  );
};

export default JobListing;
