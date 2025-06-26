// Hook-related types and interfaces

import { ProcessedJob, SkippedJob, JobStatus } from './job.types';
import { SearchProgress, SearchSession } from './search.types';

// useJobSearch hook types
export interface UseJobSearchProps {
  userId: string;
  onSearchComplete: () => void;
  onJobResult: (job: ProcessedJob) => void;
}

export interface UseJobSearchReturn {
  isSearching: boolean;
  progress: SearchProgress;
  skippedJobs: SkippedJob[];
  searchComplete: boolean;
  activeSearchSession: SearchSession | null;
  setIsSearching: (searching: boolean) => void;
  setProgress: (progress: SearchProgress) => void;
  setSearchComplete: (complete: boolean) => void;
  setActiveSearchSession: (session: SearchSession | null) => void;
  setSkippedJobs: (jobs: SkippedJob[]) => void;
  handleSubmit: (resumeText: string, preferences: string, jobTitle: string) => Promise<void>;
  handleCancelSearch: () => Promise<void>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>, onResumeChange: (text: string) => void) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

// useJobResults hook types
export interface UseJobResultsProps {
  userId: string;
}

export interface UseJobResultsReturn {
  jobResults: ProcessedJob[];
  statusFilter: string;
  filteredJobs: ProcessedJob[];
  setJobResults: React.Dispatch<React.SetStateAction<ProcessedJob[]>>;
  setStatusFilter: (filter: string) => void;
  refreshJobResults: () => Promise<void>;
  updateJobStatus: (jobId: string, status: JobStatus) => Promise<void>;
  initializeJobData: (
    setActiveSearchSession: (session: SearchSession | null) => void,
    setIsSearching: (searching: boolean) => void,
    setProgress: (progress: SearchProgress) => void,
    setSearchComplete: (complete: boolean) => void
  ) => Promise<void>;
}

// useSearchSession hook types
export interface UseSearchSessionProps {
  userId: string;
  onProgressUpdate: (progress: { current: number; total: number; status: string }) => void;
  onStatusChange: (status: string) => void;
  enabled: boolean;
}