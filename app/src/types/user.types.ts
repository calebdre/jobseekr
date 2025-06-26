// User-related types and interfaces

export interface UserData {
  userId: string;
  resumeText: string;
  preferences: string;
  jobTitle: string;
}

export interface UseUserDataReturn extends UserData {
  setResumeText: (value: string) => void;
  setPreferences: (value: string) => void;
  setJobTitle: (value: string) => void;
  handleResumeChange: (value: string) => void;
  handlePreferencesChange: (value: string) => void;
  handleJobTitleChange: (value: string) => void;
}