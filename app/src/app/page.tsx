"use client";

import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [userId, setUserId] = useState<string>("");
  const [resumeText, setResumeText] = useState("");
  const [preferences, setPreferences] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate UUID
  const generateUserId = () => {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now();
  };

  // Initialize userId and load saved data
  useEffect(() => {
    let storedUserId = localStorage.getItem('jobseekr_userId');
    
    if (!storedUserId) {
      storedUserId = generateUserId();
      localStorage.setItem('jobseekr_userId', storedUserId);
    }
    
    setUserId(storedUserId);
    
    // Load saved resume, preferences, and job title
    const savedResume = localStorage.getItem('jobseekr_resume');
    const savedPreferences = localStorage.getItem('jobseekr_preferences');
    const savedJobTitle = localStorage.getItem('jobseekr_jobTitle');
    
    if (savedResume) setResumeText(savedResume);
    if (savedPreferences) setPreferences(savedPreferences);
    if (savedJobTitle) setJobTitle(savedJobTitle);
  }, []);

  // Save resume to localStorage when it changes
  const handleResumeChange = (value: string) => {
    setResumeText(value);
    localStorage.setItem('jobseekr_resume', value);
  };

  // Save preferences to localStorage when they change
  const handlePreferencesChange = (value: string) => {
    setPreferences(value);
    localStorage.setItem('jobseekr_preferences', value);
  };

  // Save job title to localStorage when it changes
  const handleJobTitleChange = (value: string) => {
    setJobTitle(value);
    localStorage.setItem('jobseekr_jobTitle', value);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        text += textContent.items.map((item: any) => item.str).join(" ") + "\n";
      }
      
      handleResumeChange(text);
    } catch (error) {
      console.error("Error parsing PDF:", error);
      alert("Error reading PDF file");
    }
  };

  // Job search state
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [jobResults, setJobResults] = useState<any[]>([]);
  const [skippedJobs, setSkippedJobs] = useState<any[]>([]);
  const [searchComplete, setSearchComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resumeText.trim()) {
      alert("Please enter your resume");
      return;
    }
    
    if (!jobTitle.trim()) {
      alert("Please enter a job title to search for");
      return;
    }

    // Reset state
    setIsSearching(true);
    setSearchComplete(false);
    setJobResults([]);
    setSkippedJobs([]);
    setProgress({ current: 0, total: 0, status: 'Starting job search...' });

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
                    setJobResults(prev => [...prev, data.data]);
                    break;
                    
                  case 'job_skipped':
                    setSkippedJobs(prev => [...prev, data.data]);
                    break;
                    
                  case 'complete':
                    setSearchComplete(true);
                    setProgress(prev => ({ ...prev, status: data.data.message }));
                    setIsSearching(false);
                    return; // Exit the loop
                    
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

  const preferencesPlaceholder = `Looking for remote software engineering roles, preferably full-stack or frontend positions. Open to $80k-120k salary range. Interested in startups or mid-size companies with good work-life balance. No interest in finance or insurance industries.`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Job Search Setup
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Job Title Section */}
            <div>
              <label htmlFor="jobTitle" className="block text-lg font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <p className="text-sm text-gray-500">
                What type of job are you looking for?
              </p>
              <p className="text-sm text-gray-500 mb-3">
              This will be used to search for relevant positions.
              </p>
              <input
                id="jobTitle"
                type="text"
                value={jobTitle}
                onChange={(e) => handleJobTitleChange(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Software Engineer, Product Manager, Data Scientist"
              />
            </div>

            {/* Resume Section */}
            <div className="relative">
              <label htmlFor="resume" className="block text-lg font-medium text-gray-700 mb-1">
                Resume
              </label>
              <p className="text-sm text-gray-500 mb-3 max-w-lg">
                Copy and paste your resume content, or upload a PDF file. Include your experience, skills, education, and any relevant background.
              </p>
              <textarea
                id="resume"
                value={resumeText}
                onChange={(e) => handleResumeChange(e.target.value)}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Paste your resume here or upload a PDF file..."
              />
              
              {/* Floating Upload Button */}
              {!resumeText.trim() && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 ease-in-out opacity-80 hover:opacity-100 shadow-lg"
                >
                  Upload PDF
                </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {/* Helpful message when resume has content */}
              {resumeText.length > 50 && (
                <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Perfect! Our AI can understand any format - no need to worry about structure, bullet points, or formatting.
                  </span>
                </div>
              )}
            </div>

            {/* Preferences Section */}
            <div>
              <label htmlFor="preferences" className="block text-lg font-medium text-gray-700 mb-1">
                Job Preferences
              </label>
              <p className="text-sm text-gray-500 mb-3 max-w-lg">
                Describe your ideal job: role types, salary range, location preferences, company size, work style (remote/hybrid), and industries you want to avoid.
              </p>
              <textarea
                id="preferences"
                value={preferences}
                onChange={(e) => handlePreferencesChange(e.target.value)}
                className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={preferencesPlaceholder}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSearching}
                className={`font-medium py-3 px-8 rounded-lg transition-colors duration-200 text-lg ${
                  isSearching 
                    ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSearching ? 'Searching...' : 'Start Job Search'}
              </button>
            </div>
          </form>

          {/* Progress Section */}
          {isSearching && (
            <div className="mt-8 bg-blue-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Search Progress</h2>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' 
                    }}
                  ></div>
                </div>
              </div>
              
              {/* Status */}
              <p className="text-gray-700">{progress.status}</p>
            </div>
          )}

          {/* Job Results */}
          {jobResults.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Job Analysis Results</h2>
              
              <div className="space-y-4">
                {jobResults.map((job, index) => (
                  <div key={job.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
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
                        {job.location && (
                          <p className="text-sm text-gray-500 mb-2">{job.location}</p>
                        )}
                        {job.salary && (
                          <p className="text-sm text-green-600 font-medium mb-2">{job.salary}</p>
                        )}
                      </div>
                      
                      {/* Recommendation Badge */}
                      <div className="ml-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          job.recommendation === 'apply' 
                            ? 'bg-green-100 text-green-800'
                            : job.recommendation === 'maybe'
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {job.recommendation.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Scores */}
                    <div className="flex space-x-6 mb-3">
                      <div className="text-sm">
                        <span className="text-gray-500">Fit Score: </span>
                        <span className="font-medium">{job.fitScore}/5</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Confidence: </span>
                        <span className="font-medium">{job.confidence}/5</span>
                      </div>
                    </div>
                    
                    {/* Summary */}
                    <p className="text-gray-700 text-sm">{job.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped Jobs Section */}
          {skippedJobs.length > 0 && (
            <div className="mt-8">
              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer text-gray-700 font-medium">
                  Skipped Jobs ({skippedJobs.length})
                </summary>
                <div className="mt-4 space-y-2">
                  {skippedJobs.map((job, index) => (
                    <div key={index} className="text-sm text-gray-600 border-l-2 border-gray-300 pl-3">
                      <strong>{job.title}</strong> at {job.company} - {job.reason}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Completion Message */}
          {searchComplete && (
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Search Complete!</h3>
              <p className="text-green-700">
                Found {jobResults.length} job{jobResults.length !== 1 ? 's' : ''} to analyze.
                {jobResults.filter(job => job.recommendation === 'apply').length > 0 && (
                  <span className="block mt-1 font-medium">
                    🎯 {jobResults.filter(job => job.recommendation === 'apply').length} job{jobResults.filter(job => job.recommendation === 'apply').length !== 1 ? 's' : ''} recommended for application!
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}