"use client";

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ProcessedComment {
  id: number;
  author: string;
  text: string;
  time: number;
  replies: any[];
  cleanText: string;
  preview: string;
}

interface HackerNewsJobCommentProps {
  comment: ProcessedComment;
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function HackerNewsJobComment({ comment }: HackerNewsJobCommentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-gray-900">
              {comment.author}
            </span>
            <span className="text-sm text-gray-500">
              {formatTime(comment.time)}
            </span>
          </div>
          
          {/* Preview when collapsed */}
          {!isExpanded && (
            <div className="mb-3">
              <p className="text-gray-700 text-sm leading-relaxed">
                <div className="prose prose-sm max-w-none ">
                    <ReactMarkdown
                    >
                      {comment.cleanText}
                    </ReactMarkdown>
                </div>
              </p>
            </div>
          )}
          
          {/* Full content when expanded */}
          {isExpanded && (
            <>
            <div className="mb-3 prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>
                {comment.cleanText}
              </ReactMarkdown>
            </div>
            </>
          )}
        </div>
        
        <button
          onClick={toggleExpanded}
          className="ml-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}