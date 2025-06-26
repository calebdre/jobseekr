// Job-related types and interfaces

export interface JobSummary {
  role: string;
  company: string;
  location: string;
  salary_range: string;
  key_technologies: string[];
}

export interface JobAnalysis {
  recommendation: 'apply' | 'maybe' | 'skip';
  fitScore: number; // 1-5
  confidence: number; // 1-5
  job_summary: string;
  fit_summary: string;
  why_good_fit: string[];
  potential_concerns: string[];
  summary: JobSummary;
  analysis: string; // Keep for backward compatibility
}

export interface ProcessedJob {
  id: string;
  userId: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  url: string;
  content: string;
  recommendation: 'apply' | 'maybe' | 'skip';
  fitScore: number;
  confidence: number;
  summary: string;
  analysis: string;
  jobSummary: string | null;
  fitSummary: string | null;
  whyGoodFit: string | null; // JSON string
  potentialConcerns: string | null; // JSON string
  keyTechnologies: string | null; // JSON string
  contentHash: string;
  status: JobStatus;
  statusUpdatedAt: string | null;
  createdAt: string;
  // Transformed fields for UI (added by API response transformation)
  why_good_fit?: string[];
  potential_concerns?: string[];
  key_technologies?: string[];
  job_summary?: string;
  fit_summary?: string;
}

export type JobStatus = 'unread' | 'applied' | 'not_interested' | 'saved_for_later';

export interface SkippedJob {
  title: string;
  company: string;
  url: string;
  reason: string;
}