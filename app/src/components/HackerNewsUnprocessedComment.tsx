import { parseHtml } from "@/lib/utils/decodeHtmlEntities";
import { formatTime } from "@/lib/utils/formatTime";
import ReactMarkdown from "react-markdown";

interface UnprocessedComment {
  commentId: string;
  author: string;
  text: string;
  time: number;
  processingStatus: "unprocessed" | "processing" | "failed";
}

interface HackerNewsUnprocessedCommentProps {
  comment: UnprocessedComment;
}

export default function HackerNewsUnprocessedComment({ comment }: HackerNewsUnprocessedCommentProps) {
  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'processing':
        return 'Currently processing...';
      case 'failed':
        return 'Processing failed';
      default:
        return 'Waiting to be processed...';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium text-gray-900">{comment.author}</span>
        <span className="text-sm text-gray-500">
          {formatTime(comment.time)}
        </span>
        <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeStyles(comment.processingStatus)}`}>
          {comment.processingStatus}
        </span>
        {comment.processingStatus === 'processing' && (
          <div className="animate-spin h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
        )}
      </div>
      
      {/* Always show the original comment text for unprocessed comments */}
      <div className="prose prose-sm max-w-none ">
      <ReactMarkdown >
        {parseHtml(comment.text)}
      </ReactMarkdown>
      </div>
      
      {/* Status message */}
      <div className="text-xs text-gray-500 italic">
        {getStatusMessage(comment.processingStatus)}
      </div>
    </div>
  );
}