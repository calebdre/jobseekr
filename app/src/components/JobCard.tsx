import { useState } from 'react';
import { JobCardProps } from '@/types';

export default function JobCard({ job, onUpdateStatus }: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-white border rounded-lg p-6 shadow-sm relative ${
      job.status === 'applied' 
        ? 'border-green-200 bg-green-50/30' 
        : job.status === 'not_interested'
        ? 'border-gray-200 bg-gray-50/50 opacity-75'
        : job.status === 'saved_for_later'
        ? 'border-yellow-200 bg-yellow-50/30'
        : 'border-gray-200'
    }`}>
      {/* Status Badge */}
      {job.status !== 'unread' && (
        <div className="absolute top-4 right-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            job.status === 'applied' 
              ? 'bg-green-100 text-green-800'
              : job.status === 'saved_for_later'
              ? 'bg-yellow-100 text-yellow-800'
              : job.status === 'not_interested'
              ? 'bg-gray-100 text-gray-600'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {job.status === 'applied' ? '✓ Applied' 
             : job.status === 'saved_for_later' ? '⭐ Saved'
             : job.status === 'not_interested' ? '✗ Not Interested'
             : 'Unread'}
          </span>
        </div>
      )}

      {/* Always Visible Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 pr-20">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            <a 
              href={job.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors"
            >
              {job.title}
            </a>
          </h3>
          <p className="text-gray-600 mb-2">{job.company}</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
            {job.location && <span>📍 {job.location}</span>}
            {job.salary && <span className="text-green-600 font-medium">💰 {job.salary}</span>}
          </div>
        </div>
        
        {/* Recommendation Badge */}
        <div className="ml-4 flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            job.recommendation === 'apply' 
              ? 'bg-green-100 text-green-800'
              : job.recommendation === 'maybe'
              ? 'bg-yellow-100 text-yellow-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {job.recommendation.toUpperCase()}
          </span>
          
          {/* Scores */}
          <div className="text-xs text-gray-500 text-right">
            <div>Fit: {job.fitScore}/5</div>
            <div>Confidence: {job.confidence}/5</div>
          </div>
        </div>
      </div>

      {/* Company Summary - Always Visible */}
      {job.company_summary && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Company</h4>
          <p className="text-sm text-gray-700">{job.company_summary}</p>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-800 border-t border-gray-100 transition-colors"
      >
        {isExpanded ? 'Show Less' : 'Show Details'}
        <svg 
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {/* Job Summary */}
          {job.job_summary && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Role Overview</h4>
              <p className="text-sm text-gray-700">{job.job_summary}</p>
            </div>
          )}
          
          {/* Fit Summary */}
          {job.fit_summary && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Fit Assessment</h4>
              <p className="text-sm text-gray-700">{job.fit_summary}</p>
            </div>
          )}
          
          {/* Why Good Fit & Concerns */}
          {((job.why_good_fit && job.why_good_fit.length > 0) || (job.potential_concerns && job.potential_concerns.length > 0)) && (
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Why Good Fit */}
              {job.why_good_fit && job.why_good_fit.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                    <span className="mr-1">✅</span>
                    Why It&apos;s a Good Fit
                  </h4>
                  <ul className="space-y-1">
                    {job.why_good_fit.map((reason, reasonIndex) => (
                      <li key={reasonIndex} className="text-sm text-gray-700 flex items-start">
                        <span className="text-green-600 mr-2 mt-0.5">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Potential Concerns */}
              {job.potential_concerns && job.potential_concerns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center">
                    <span className="mr-1">⚠️</span>
                    Potential Concerns
                  </h4>
                  <ul className="space-y-1">
                    {job.potential_concerns.map((concern, concernIndex) => (
                      <li key={concernIndex} className="text-sm text-gray-700 flex items-start">
                        <span className="text-amber-600 mr-2 mt-0.5">•</span>
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Raw Analysis */}
          {job.analysis && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Raw Analysis</h4>
              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {job.analysis}
              </div>
            </div>
          )}
          
          {/* Fallback to original summary if new fields aren't available */}
          {!job.job_summary && !job.fit_summary && job.summary && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Summary</h4>
              <p className="text-sm text-gray-700">{job.summary}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-2 justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onUpdateStatus(job.id, 'applied')}
                  disabled={job.status === 'applied'}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    job.status === 'applied'
                      ? 'bg-green-100 text-green-800 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {job.status === 'applied' ? '✓ Applied' : 'Mark as Applied'}
                </button>
                
                <button
                  onClick={() => onUpdateStatus(job.id, 'saved_for_later')}
                  disabled={job.status === 'saved_for_later'}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    job.status === 'saved_for_later'
                      ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'
                  }`}
                >
                  {job.status === 'saved_for_later' ? '⭐ Saved' : 'Save for Later'}
                </button>
                
                <button
                  onClick={() => onUpdateStatus(job.id, 'not_interested')}
                  disabled={job.status === 'not_interested'}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    job.status === 'not_interested'
                      ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {job.status === 'not_interested' ? '✗ Not Interested' : 'Not Interested'}
                </button>

                {job.status !== 'unread' && (
                  <button
                    onClick={() => onUpdateStatus(job.id, 'unread')}
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-all"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Visit Job Button */}
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all inline-flex items-center gap-1"
              >
                Visit Job
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}