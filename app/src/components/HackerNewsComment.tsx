import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Button, Collapse } from '@mantine/core';
import { formatTime } from "@/lib/utils/formatTime";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SafeJobPosting } from './SafeJobPosting';
import { HackerNewsComment as Comment, HackerNewsCommentProcessingStatus } from '@/types/hackernews';
import { Doc } from '../../convex/_generated/dataModel';

interface HackerNewsCommentProps {
    comment: Comment;
    userId: string;
    resumeText: string;
    preferences: string;
}
  
export default function HackerNewsComment({ 
    comment,
    userId,
    resumeText,
    preferences
}: HackerNewsCommentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isProcessed = comment.processingStatus === "completed" && comment.jobData;

  // Get existing analysis for processed comments
  const existingAnalysis = useQuery(
    api.hackernews.getUserAnalysis,
    isProcessed && userId ? {
      userId,
      commentId: comment._id as any,
    } : "skip"
  ) as Doc<"hackernews_analyses"> | null;

  // Mutation to trigger job analysis
  const analyzeJobFit = useAction(api.hackernews.analyzeCommentJobFit);

  // Check if both resume and preferences are provided
  const hasResume = resumeText?.trim().length > 0;
  const hasPreferences = preferences?.trim().length > 0;
  const canAnalyze = hasResume && hasPreferences && isProcessed && userId;
  
  // Generate tooltip message for disabled state
  const getDisabledMessage = () => {
    if (!hasResume && !hasPreferences) return "Please provide both resume and job preferences to analyze fit";
    if (!hasResume) return "Please provide your resume to analyze fit";
    if (!hasPreferences) return "Please provide your job preferences to analyze fit";
    return "";
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAnalyzeJobFit = async () => {
    if (!canAnalyze || isAnalyzing || !userId) return;
    
    setIsAnalyzing(true);
    try {
      await analyzeJobFit({
        commentId: comment._id as any,
        userId,
        resumeText: resumeText!,
        preferences: preferences!,
      });
    } catch (error) {
      console.error('Failed to analyze job fit:', error);
      alert('Failed to analyze job fit. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusBadgeStyles = (status: HackerNewsCommentProcessingStatus) => {
    switch (status) {
      case HackerNewsCommentProcessingStatus.PROCESSING:
        return 'bg-yellow-100 text-yellow-800';
      case HackerNewsCommentProcessingStatus.FAILED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusMessage = (status: HackerNewsCommentProcessingStatus) => {
    switch (status) {
      case HackerNewsCommentProcessingStatus.PROCESSING:
        return 'Currently processing...';
      case HackerNewsCommentProcessingStatus.FAILED:
        return 'Processing failed';
      default:
        return 'Waiting to be processed...';
    }
  };

  if (existingAnalysis) {
    console.log(existingAnalysis)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-gray-900">{comment.author}</span>
            <span className="text-sm text-gray-500">
              {formatTime(comment.time)}
            </span>
            {!isProcessed && (
              <>
                <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeStyles(comment.processingStatus)}`}>
                  {comment.processingStatus}
                </span>
                {comment.processingStatus === HackerNewsCommentProcessingStatus.PROCESSING && (
                  <div className="animate-spin h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                )}
              </>
            )}
          </div>
          
          {isProcessed && comment.jobData ? (
            <>
              {/* Default view: Show extracted job data */}
              <div className="space-y-2">
                {comment.jobData.jobTitle && (
                  <div className="text-sm">
                    <strong className="text-gray-900">Job:</strong> 
                    <span className="ml-1 text-gray-700">{comment.jobData.jobTitle}</span>
                  </div>
                )}
                
                {comment.jobData.company && (
                  <div className="text-sm">
                    <strong className="text-gray-900">Company:</strong> 
                    <span className="ml-1 text-gray-700">{comment.jobData.company}</span>
                  </div>
                )}
                
                {comment.jobData.location && (
                  <div className="text-sm">
                    <strong className="text-gray-900">Location:</strong> 
                    <span className="ml-1 text-gray-700">{comment.jobData.location}</span>
                  </div>
                )}
                
                {comment.jobData.salary && (
                  <div className="text-sm">
                    <strong className="text-gray-900">Salary:</strong> 
                    <span className="ml-1 text-gray-700">{comment.jobData.salary}</span>
                  </div>
                )}
                
                {comment.jobData.technologies && comment.jobData.technologies.length > 0 && (
                  <div className="text-sm">
                    <strong className="text-gray-900">Technologies:</strong> 
                    <div className="mt-1 flex flex-wrap gap-1">
                      {comment.jobData.technologies.map((tech, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {comment.jobData.experienceLevel && (
                  <div className="text-sm">
                    <strong className="text-gray-900">Experience:</strong> 
                    <span className="ml-1 text-gray-700">{comment.jobData.experienceLevel}</span>
                  </div>
                )}
                
                {comment.jobData.roleOverview && (
                  <div className="text-sm">
                    <strong className="text-gray-900">Role:</strong> 
                    <span className="ml-1 text-gray-700">{comment.jobData.roleOverview}</span>
                  </div>
                )}
                
                {comment.jobData.contactInfo && (
                  <div className="text-sm">
                    <strong className="text-gray-900">Contact:</strong> 
                    <span className="ml-1 text-blue-600">{comment.jobData.contactInfo}</span>
                  </div>
                )}
                
                {/* Job Fit Analysis Button */}
                {userId && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-x-4 flex items-center">
                    <button
                      onClick={handleAnalyzeJobFit}
                      disabled={!canAnalyze || isAnalyzing}
                      title={!canAnalyze ? getDisabledMessage() : "Analyze how well this job fits your profile"}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        canAnalyze && !isAnalyzing
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isAnalyzing ? (
                        <span className="flex items-center">
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Analyzing...
                        </span>
                      ) : existingAnalysis ? (
                        'Re-analyze Job Fit'
                      ) : (
                        'Analyze Job Fit'
                      )}
                    </button>

                    <Button
                     variant="subtle"
                      color="gray"
                      size="xs"
                      onClick={() => setIsExpanded(!isExpanded)}
                      >
                        {isExpanded ? 'Hide Comment' : 'Show Comment'}
                        </Button>
                  </div>
                )}
                
                {/* Analysis Results */}
                {existingAnalysis && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Job Fit Analysis</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          existingAnalysis.recommendation === 'apply' 
                            ? 'bg-green-100 text-green-800'
                            : existingAnalysis.recommendation === 'maybe'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {existingAnalysis.recommendation}
                        </span>
                        <span className="text-xs text-gray-500">
                          Fit: {existingAnalysis.fitScore}/5
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">
                        {existingAnalysis.fitSummary}
                    </p>
                    
                    <div className="text-sm text-gray-700 mb-2">
                     {existingAnalysis.analysis}
                    </div>

                    {existingAnalysis.whyGoodFit.length > 0 && (
                      <div className="text-sm mb-2">
                        <strong className="text-green-700">Good Fit:</strong>
                        <ul className="mt-1 ml-4 list-disc text-gray-700">
                          {existingAnalysis.whyGoodFit.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {existingAnalysis.potentialConcerns.length > 0 && (
                      <div className="text-sm">
                        <strong className="text-red-700">Concerns:</strong>
                        <ul className="mt-1 ml-4 list-disc text-gray-700">
                          {existingAnalysis.potentialConcerns.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Collapsible original comment text */}
              <Collapse in={isExpanded}>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    <SafeJobPosting content={comment.text} />
                  </div>
                </div>
              </Collapse>
            </>
          ) : (
            <>
              {/* Unprocessed: Always show the original comment text */}
              <div className="prose prose-sm max-w-none">
                <SafeJobPosting content={comment.text} />
              </div>
              
              {/* Status message */}
              <div className="text-xs text-gray-500 italic mt-2">
                {getStatusMessage(comment.processingStatus)}
              </div>
            </>
          )}
        </div>
        
        {/* Collapse/Expand Button - only for processed comments */}
        {isProcessed && (
          <button
            onClick={toggleExpanded}
            className="ml-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title={isExpanded ? "Hide original comment" : "Show original comment"}
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

    