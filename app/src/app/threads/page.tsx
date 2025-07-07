'use client'
import React, { useState, useEffect } from 'react';
import { Calendar, MessageCircle, TrendingUp, ExternalLink, RefreshCw, Briefcase } from 'lucide-react';

const HiringThreadBrowser = () => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [error, setError] = useState('');

  const fetchThreads = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        query: '', // Empty query to get all results
        tags: 'story,author_whoishiring', // HN uses tags format for author filtering
        hitsPerPage: '100' // Get more results since we're filtering by author
      });

      const response = await fetch(`https://hn.algolia.com/api/v1/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Sort threads
      const sorted = data.hits.sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.created_at) - new Date(a.created_at);
        } else if (sortBy === 'score') {
          return b.points - a.points;
        } else if (sortBy === 'comments') {
          return b.num_comments - a.num_comments;
        }
        return 0;
      });

      setThreads(sorted);
    } catch (err) {
      setError(`Failed to fetch threads: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [sortBy]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getThreadUrl = (thread) => {
    return thread.url || `https://news.ycombinator.com/item?id=${thread.objectID}`;
  };

  const getScoreColor = (score) => {
    if (score >= 100) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getThreadType = (title) => {
    const lowercaseTitle = title.toLowerCase();
    if (lowercaseTitle.includes('who is hiring') || lowercaseTitle.includes('who\'s hiring')) {
      return { type: 'hiring', icon: '💼', color: 'bg-blue-50 text-blue-700' };
    } else if (lowercaseTitle.includes('freelancer') || lowercaseTitle.includes('seeking freelance')) {
      return { type: 'freelance', icon: '🏠', color: 'bg-green-50 text-green-700' };
    } else if (lowercaseTitle.includes('wants to be hired') || lowercaseTitle.includes('seeking work')) {
      return { type: 'seeking', icon: '👋', color: 'bg-purple-50 text-purple-700' };
    }
    return { type: 'other', icon: '📋', color: 'bg-gray-50 text-gray-700' };
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Briefcase className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Official HN Hiring Threads
          </h1>
        </div>
        <p className="text-gray-600">
          All threads posted by the official <span className="font-mono bg-gray-100 px-2 py-1 rounded">whoishiring</span> account
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">Date (newest first)</option>
            <option value="score">Score (highest first)</option>
            <option value="comments">Comments (most first)</option>
          </select>
        </div>
        
        <button
          onClick={fetchThreads}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading official hiring threads...</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No threads found. This might be an API issue.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600 flex items-center justify-between">
              <span>Found {threads.length} official threads</span>
              <span className="text-xs">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
            
            {threads.map((thread) => {
              const threadInfo = getThreadType(thread.title);
              
              return (
                <div
                  key={thread.objectID}
                  className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all hover:border-gray-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${threadInfo.color}`}>
                          {threadInfo.icon} {threadInfo.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          #{thread.objectID}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                        {thread.title}
                      </h3>
                    </div>
                    <a
                      href={getThreadUrl(thread)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                    >
                      View on HN <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(thread.created_at)}
                    </div>
                    
                    <div className={`flex items-center gap-1 ${getScoreColor(thread.points)}`}>
                      <TrendingUp className="w-4 h-4" />
                      {thread.points} points
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {thread.num_comments} comments
                    </div>
                    
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                      by {thread.author}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* API Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">How This Works</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Uses HN's Algolia API with <code className="bg-blue-100 px-1 rounded">facetFilters: ['author:whoishiring']</code></p>
          <p>• Gets all official threads (hiring, freelance, seeking work) in chronological order</p>
          <p>• No search input needed - just filters by the official account</p>
          <p>• Updates in real-time as new threads are posted</p>
        </div>
      </div>
    </div>
  );
};

export default HiringThreadBrowser;