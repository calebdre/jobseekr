import { useState, useEffect } from 'react';

interface Comment {
  id: number;
  author: string;
  text: string;
  time: number;
  replies: Comment[];
}

interface HackerNewsThread {
  id: number;
  title: string;
  author: string;
  time: number;
  url?: string;
  commentCount: number;
}

interface HackerNewsResponse {
  thread: HackerNewsThread;
  comments: Comment[];
}

interface ProcessedComment extends Comment {
  cleanText: string;
  preview: string;
}

interface UseHackernewsThreadsReturn {
  data: HackerNewsResponse | null;
  processedComments: ProcessedComment[];
  loading: boolean;
  error: string | null;
}

const decodeHtmlEntities = (html: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
};

const parseHtml = (html: string) => {
  // Convert HTML to markdown-like format for react-markdown
  let content = html
    .replace(/<p>/g, '\n\n')
    .replace(/<\/p>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g, '[$2]($1)')
    .replace(/<[^>]*>/g, '');
  
  // Decode HTML entities using native browser functionality
  return decodeHtmlEntities(content);
};

export const useHackernewsThreads = (threadId: string): UseHackernewsThreadsReturn => {
  const [data, setData] = useState<HackerNewsResponse | null>(null);
  const [processedComments, setProcessedComments] = useState<ProcessedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHackerNewsJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/hackernews?threadId=${threadId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        
        // Process comments once when data is fetched
        const processed = result.comments.map((comment: Comment) => {
          const cleanText = parseHtml(comment.text);
          const preview = cleanText.substring(0, 200) + (cleanText.length > 200 ? '...' : '');
          return {
            ...comment,
            cleanText,
            preview
          };
        });
        setProcessedComments(processed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch HackerNews jobs');
      } finally {
        setLoading(false);
      }
    };

    if (threadId) {
      fetchHackerNewsJobs();
    }
  }, [threadId]);

  return {
    data,
    processedComments,
    loading,
    error
  };
};