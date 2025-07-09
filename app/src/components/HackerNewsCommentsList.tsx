import HackerNewsComment from './HackerNewsComment';
import { HackerNewsComment as Comment } from '@/types/hackernews';

interface HackerNewsCommentsListProps {
    comments: Comment[];
    userId: string;
    resumeText: string;
    preferences: string;
    threadId: string;
}

export default function HackerNewsCommentsList({ 
    comments,
    userId,
    resumeText,
    preferences
}: HackerNewsCommentsListProps) {
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
      
      {comments.map((comment) => (
        <HackerNewsComment
          key={comment.commentId}
          comment={comment}
          userId={userId}
          resumeText={resumeText}
          preferences={preferences}
        />
      ))}
    </div>
  );
}