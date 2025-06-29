import { useState, useRef } from 'react';
import { UseJobSearchProps, UseJobSearchReturn, SearchProgress, SkippedJob, SearchSession } from '@/types';

export function useJobSearch({ userId, onSearchComplete, onJobResult }: UseJobSearchProps): UseJobSearchReturn {
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState<SearchProgress>({ current: 0, total: 0, status: '' });
  const [skippedJobs, setSkippedJobs] = useState<SkippedJob[]>([]);
  const [searchComplete, setSearchComplete] = useState(false);
  const [activeSearchSession, setActiveSearchSession] = useState<SearchSession | null>(null);
  const [batchComplete, setBatchComplete] = useState(false);
  const [batchInfo, setBatchInfo] = useState<{
    batch_processed: number;
    total_processed: number;
    total_results: number;
    remaining: number;
    total_applied: number;
    message: string;
  } | null>(null);
  const [resultsChangedNotification, setResultsChangedNotification] = useState<{
    oldTotal: number;
    newTotal: number;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, onResumeChange: (text: string) => void) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      alert("Please select a PDF file");
      return;
    }

    try {
      // Dynamically import PDF.js only on the client side
      const pdfjs = await import('pdfjs-dist');
      
      // Set worker source to CDN
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
      
      const { getDocument } = pdfjs;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      let text = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        text += textContent.items
          .map(item => 'str' in item ? item.str : '')
          .filter(Boolean)
          .join(" ") + "\n";
      }
      
      onResumeChange(text);
    } catch (error) {
      console.error("Error parsing PDF:", error);
      alert("Error reading PDF file");
    }
  };

  const handleSubmit = async (resumeText: string, preferences: string, jobTitle: string) => {
    if (!resumeText.trim()) {
      alert("Please enter your resume");
      return;
    }
    
    if (!jobTitle.trim()) {
      alert("Please enter a job title to search for");
      return;
    }

    // Check if search is already in progress
    if (isSearching || activeSearchSession) {
      alert("Search already in progress. Please wait for it to complete.");
      return;
    }

    // Reset state
    setIsSearching(true);
    setSearchComplete(false);
    setSkippedJobs([]);
    setProgress({ current: 0, total: 0, status: 'Starting job search...' });
    setResultsChangedNotification(null);

    try {
      // Use fetch for POST request with SSE
      const response = await fetch('/api/search/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          resume: resumeText,
          preferences: preferences,
          jobTitle: jobTitle
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setIsSearching(false);
          break;
        }

        // Decode and process the chunk
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr);
                
                switch (data.type) {
                  case 'progress':
                    setProgress(data.data);
                    break;
                    
                  case 'job':
                    onJobResult(data.data);
                    break;
                    
                  case 'job_skipped':
                    setSkippedJobs(prev => [...prev, data.data]);
                    break;
                    
                  case 'batch_complete':
                    setBatchComplete(true);
                    setBatchInfo(data.data);
                    setProgress(prev => ({ ...prev, status: data.data.message }));
                    setIsSearching(false);
                    break;
                    
                  case 'complete':
                    setSearchComplete(true);
                    setBatchComplete(false);
                    setBatchInfo(null);
                    setProgress(prev => ({ ...prev, status: data.data.message }));
                    setIsSearching(false);
                    onSearchComplete();
                    return; // Exit the loop
                    
                  case 'results_changed':
                    // Show notification about result count change
                    setResultsChangedNotification(data.data);
                    console.log('Results changed:', data.data.message);
                    break;
                    
                  case 'error':
                    console.error('Search error:', data.data.message);
                    alert(`Search error: ${data.data.message}`);
                    setIsSearching(false);
                    return; // Exit the loop
                }
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error starting search:', error);
      setIsSearching(false);
      alert('Failed to start job search');
    }
  };

  // Function to continue search (process next batch)
  const handleContinueSearch = async (resumeText: string, preferences: string, jobTitle: string) => {
    if (!userId) return;
    
    // Reset batch completion state
    setBatchComplete(false);
    setBatchInfo(null);
    
    // Use the same handleSubmit logic but don't reset all state
    await handleSubmit(resumeText, preferences, jobTitle);
  };

  // Function to stop batch processing
  const handleStopBatch = () => {
    setBatchComplete(false);
    setBatchInfo(null);
    setSearchComplete(true);
  };

  // Function to dismiss results changed notification
  const dismissResultsChangedNotification = () => {
    setResultsChangedNotification(null);
  };

  // Function to cancel active search
  const handleCancelSearch = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/search/status?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setIsSearching(false);
        setActiveSearchSession(null);
        setBatchComplete(false);
        setBatchInfo(null);
        setProgress({ current: 0, total: 0, status: 'Search cancelled' });
        console.log('Search cancelled successfully');
      }
    } catch (error) {
      console.error('Error cancelling search:', error);
      alert('Failed to cancel search');
    }
  };

  return {
    isSearching,
    progress,
    skippedJobs,
    searchComplete,
    activeSearchSession,
    batchComplete,
    batchInfo,
    resultsChangedNotification,
    setIsSearching,
    setProgress,
    setSearchComplete,
    setActiveSearchSession,
    setSkippedJobs,
    handleSubmit,
    handleContinueSearch,
    handleStopBatch,
    dismissResultsChangedNotification,
    handleCancelSearch,
    handleFileUpload,
    fileInputRef,
  };
}