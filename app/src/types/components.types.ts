// Component-related types and interfaces

import { ProcessedJob, JobStatus } from './job.types';

export interface JobCardProps {
  job: ProcessedJob;
  onUpdateStatus: (jobId: string, status: JobStatus) => void;
}