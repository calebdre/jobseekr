import HackerNewsProcessedComment from './HackerNewsProcessedComment';
import HackerNewsUnprocessedComment from './HackerNewsUnprocessedComment';

interface Comment {
  _id: string;
  commentId: string;
  author: string;
  text: string;
  time: number;
  processingStatus: "unprocessed" | "processing" | "completed" | "failed";
  jobData?: {
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
  };
}

interface HackerNewsCommentsListProps {
  comments: Comment[];
  userId: string;
  resumeText: string;
  preferences: string;
  threadId: string;
}

export default function HackerNewsCommentsList({ comments, userId, resumeText, preferences }: HackerNewsCommentsListProps) {
  if (comments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No job postings found in this thread.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Job Postings ({comments.length})
      </h3>
      
      {comments.map((comment) => {
        // Use different components based on processing status
        if (comment.processingStatus === 'completed' && comment.jobData) {
          return (
            <HackerNewsProcessedComment
              key={comment.commentId}
              comment={{
                ...comment,
                processingStatus: 'completed',
                jobData: comment.jobData,
              }}
              userId={userId}
              resumeText={resumeText}
              preferences={preferences}
            />
          );
        } else {
          return (
            <HackerNewsUnprocessedComment
              key={comment.commentId}
              comment={{
                ...comment,
                processingStatus: comment.processingStatus as "unprocessed" | "processing" | "failed",
              }}
            />
          );
        }
      })}
    </div>
  );
}