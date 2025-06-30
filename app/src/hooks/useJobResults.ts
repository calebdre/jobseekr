import { useState, useCallback } from 'react';
import { UseJobResultsProps, UseJobResultsReturn, ProcessedJob, SearchProgress, SearchSession, JobStatus } from '@/types';

export function useJobResults({ userId }: UseJobResultsProps): UseJobResultsReturn {
  const [jobResults, setJobResults] = useState<ProcessedJob[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Function to refresh job results
  const refreshJobResults = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/jobs?userId=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        setJobResults(data.jobs || []);
      }
    } catch (error) {
      console.error('Error refreshing job results:', error);
    }
  }, [userId, setJobResults]);

  // Function to update job status
  const updateJobStatus = useCallback(async (jobId: string, status: JobStatus) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Update local state
        setJobResults(prev => 
          prev.map(job => 
            job.id === jobId 
              ? { ...job, status, statusUpdatedAt: new Date().toISOString() }
              : job
          )
        );
      } else {
        alert('Failed to update job status');
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      alert('Failed to update job status');
    }
  }, [setJobResults]);

  // Initialize job data on component mount
  const initializeJobData = useCallback(async (
    setActiveSearchSession: (session: SearchSession | null) => void,
    setIsSearching: (searching: boolean) => void, 
    setProgress: (progress: SearchProgress) => void,
    setSearchComplete: (complete: boolean) => void
  ) => {
    if (!userId) return;

    try {
      let searchData = null;
      
      // Check for active search session
      const searchStatusResponse = await fetch(`/api/search/status?userId=${encodeURIComponent(userId)}`);
      if (searchStatusResponse.ok) {
        searchData = await searchStatusResponse.json();
        if (searchData.hasActiveSearch) {
          setActiveSearchSession(searchData.session);
          // Only set isSearching to true if search is actually in progress
          if (searchData.session.status === 'in_progress') {
            setIsSearching(true);
          }
          setProgress({
            current: searchData.session.progress.current,
            total: searchData.session.progress.total,
            status: searchData.session.progress.message
          });
          // Real-time subscription will be started automatically by the useSearchSession hook
          console.log('Active search found, will start real-time subscription:', searchData.session);
        }
      }

      // Fetch existing jobs
      const jobsResponse = await fetch(`/api/jobs?userId=${encodeURIComponent(userId)}`);
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        if (jobsData.jobs && jobsData.jobs.length > 0) {
          setJobResults(jobsData.jobs);
          if (!searchData?.hasActiveSearch) {
            setSearchComplete(true);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  }, [userId, setJobResults]);

  // Filter and sort jobs based on status (latest processed first)
  const filteredJobs = jobResults
    .filter(job => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'to_apply') return job.status === 'unread' && job.recommendation === 'apply';
      return job.status === statusFilter;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    jobResults,
    statusFilter,
    filteredJobs,
    setJobResults,
    setStatusFilter,
    refreshJobResults,
    updateJobStatus,
    initializeJobData,
  };
}