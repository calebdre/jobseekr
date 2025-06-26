import { useState, useEffect } from 'react';
import { UseUserDataReturn } from '@/types';

export function useUserData(): UseUserDataReturn {
  const [userId, setUserId] = useState<string>('');
  const [resumeText, setResumeText] = useState('');
  const [preferences, setPreferences] = useState('');
  const [jobTitle, setJobTitle] = useState('');

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

  return {
    userId,
    resumeText,
    preferences,
    jobTitle,
    setResumeText,
    setPreferences,
    setJobTitle,
    handleResumeChange,
    handlePreferencesChange,
    handleJobTitleChange,
  };
}