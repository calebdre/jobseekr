"use client";

import { useState, useEffect } from 'react';
import { getHiringThreads } from '@/lib/services/hackernews';

interface HiringThread {
  id: string;
  title: string;
  url: string;
  created_at: string;
  points: number;
  num_comments: number;
  type: 'hiring' | 'freelance' | 'seeking' | 'other';
}

interface HNHiringThreadsInputProps {
  selectedThreadId: string;
  onChangeSelectedThread: (threadId: string) => void;
}

interface ThreadsCache {
  threads: HiringThread[];
  timestamp: number;
  month: number;
}

const CACHE_KEY = 'hn-hiring-threads-cache';

export default function HNHiringThreadsInput({ 
  selectedThreadId, 
  onChangeSelectedThread 
}: HNHiringThreadsInputProps) {
  const [threads, setThreads] = useState<HiringThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCacheValid = (cache: ThreadsCache): boolean => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const cacheAge = Date.now() - cache.timestamp;
    
    // Invalidate if we're in first week of new month
    if (currentDay <= 7 && currentMonth !== cache.month) {
      return false;
    }
    
    // Invalidate if cache is older than 30 days
    if (cacheAge > 30 * 24 * 60 * 60 * 1000) {
      return false;
    }
    
    return true;
  };

  const fetchThreads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        try {
          const cache: ThreadsCache = JSON.parse(cachedData);
          if (isCacheValid(cache)) {
            console.log('Using cached hiring threads');
            const hiringThreads = cache.threads.filter(thread => thread.type === 'hiring');
            setThreads(hiringThreads);
            
            // Auto-select latest thread if none selected
            if (!selectedThreadId && hiringThreads.length > 0) {
              onChangeSelectedThread(hiringThreads[0].id);
            }
            
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Invalid cache data, fetching fresh');
        }
      }
      
      // Fetch fresh data
      console.log('Fetching fresh hiring threads from API');
      const allThreads = await getHiringThreads();
      const hiringThreads = allThreads.filter(thread => thread.type === 'hiring');
      
      if (hiringThreads.length === 0) {
        throw new Error('No hiring threads found');
      }
      
      setThreads(hiringThreads);
      
      // Cache the results
      const cacheData: ThreadsCache = {
        threads: allThreads,
        timestamp: Date.now(),
        month: new Date().getMonth()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      
      // Auto-select latest thread if none selected
      if (!selectedThreadId && hiringThreads.length > 0) {
        onChangeSelectedThread(hiringThreads[0].id);
      }
      
    } catch (err) {
      console.error('Failed to fetch hiring threads:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch hiring threads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleThreadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const threadId = e.target.value;
    onChangeSelectedThread(threadId);
  };

  const formatThreadTitle = (thread: HiringThread) => {
    const date = new Date(thread.created_at);
    const monthYear = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    return `${monthYear} (${thread.num_comments} jobs)`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-sm text-gray-600">Loading hiring threads...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">
          <h3 className="font-medium text-sm">Couldn't get hiring threads</h3>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <label htmlFor="hiring-thread" className="block text-sm font-medium text-gray-700">
          Select Hiring Thread
        </label>
        <button
          onClick={fetchThreads}
          className="text-xs text-blue-600 hover:text-blue-800"
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      
      <select
        id="hiring-thread"
        value={selectedThreadId}
        onChange={handleThreadChange}
        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      >
        <option value="">Select a hiring thread...</option>
        {threads.map((thread) => (
          <option key={thread.id} value={thread.id}>
            {formatThreadTitle(thread)}
          </option>
        ))}
      </select>
      
      {threads.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Found {threads.length} recent hiring threads
        </p>
      )}
    </div>
  );
}