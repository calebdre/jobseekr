export interface JobData {
  jobTitle?: string;
  company?: string;
  location?: string;
  salary?: string;
  employmentType?: string;
  roleOverview?: string;
  keyRequirements?: string[];
  technologies?: string[];
  experienceLevel?: string;
  contactInfo?: string;
  confidence: number;
  isValidJobPosting: boolean;
}

export interface HackerNewsComment {
  _id: string;
  commentId: string;
  author: string;
  text: string;
  time: number;
  processingStatus: HackerNewsCommentProcessingStatus;
  jobData?: JobData;
}

export enum HackerNewsCommentProcessingStatus {
  UNPROCESSED = "unprocessed",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}