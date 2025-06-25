"""
Text extraction utilities with regex patterns for job data parsing
"""
import re
from typing import Optional, List

class CompanyExtractor:
    """Extract company names from job search results"""
    
    @staticmethod
    def extract_from_title(title: str) -> Optional[str]:
        """Extract company from @ pattern in title"""
        match = re.search(r'@\s*([^\|\-]+?)(?:\s*$|\s*\||\s*\-)', title)
        return match.group(1).strip() if match else None
    
    @staticmethod
    def extract_from_greenhouse_url(url: str) -> Optional[str]:
        """Extract company from greenhouse.io URLs"""
        if 'greenhouse.io' not in url:
            return None
        match = re.search(r'boards\.greenhouse\.io/([^/]+)/', url)
        return match.group(1).replace('-', ' ').title() if match else None
    
    @staticmethod
    def extract_from_metadata(og_title: str) -> Optional[str]:
        """Extract company from og:title metadata"""
        patterns = [
            r'\-\s*([^\-\|]+?)\s*$',  # "Job Title - Company"
            r'\|\s*([^\-\|]+?)\s*$',  # "Job Title | Company"
            r'at\s+([^\-\|]+?)(?:\s*$|\s*\||\s*\-)',  # "Job Title at Company"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, og_title)
            if match:
                return match.group(1).strip()
        return None

class LocationExtractor:
    """Extract location information from job data"""
    
    # Common non-location terms to filter out
    NON_LOCATION_TERMS = ['engineer', 'developer', 'software', 'job', 'position']
    
    @staticmethod
    def extract_from_title(title: str) -> Optional[str]:
        """Extract location from title patterns"""
        patterns = [
            r'Remote\s*-\s*([^\-\|]+)',  # "Remote - USA"
            r'([^\-\|]+)\s*-\s*Remote',  # "USA - Remote" 
            r'\-\s*([^\-\|,]+(?:,\s*[^\-\|]+)*)\s*$',  # Location at end after dash
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title)
            if match:
                potential_location = match.group(1).strip()
                if not LocationExtractor._contains_non_location_terms(potential_location):
                    return potential_location
        return None
    
    @staticmethod
    def extract_from_snippet(snippet: str) -> Optional[str]:
        """Extract location from job snippet"""
        match = re.search(r'Location[:\.]?\s*([^\n\r\.]+)', snippet)
        return match.group(1).strip() if match else None
    
    @staticmethod
    def detect_remote(title: str) -> bool:
        """Check if job is remote based on title"""
        return bool(re.search(r'\bremote\b', title.lower()))
    
    @staticmethod
    def _contains_non_location_terms(text: str) -> bool:
        """Check if text contains terms that indicate it's not a location"""
        text_lower = text.lower()
        return any(term in text_lower for term in LocationExtractor.NON_LOCATION_TERMS)

class SalaryExtractor:
    """Extract salary information from job data"""
    
    @staticmethod
    def extract_from_snippet(snippet: str) -> Optional[str]:
        """Extract salary from job snippet"""
        patterns = [
            r'\$([\d,]+)\s*[–\-]\s*\$([\d,]+)',  # "$150K – $200K"
            r'Compensation[:\.]?\s*\$([\d,]+)\s*[–\-]\s*\$([\d,]+)',  # "Compensation: $150K – $200K"
            r'([\d,]+)K\s*[–\-]\s*([\d,]+)K',  # "150K – 200K"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, snippet)
            if match:
                if len(match.groups()) == 2:
                    return f"${match.group(1)} - ${match.group(2)}"
                else:
                    return f"${match.group(1)}"
        return None

class TimeExtractor:
    """Extract posting time information"""
    
    @staticmethod
    def extract_posted_time(snippet: str) -> str:
        """Extract posted time from snippet (e.g., '2 days ago', '10 hours ago')"""
        match = re.search(r'(\d+\s+(?:day|hour|minute|second)s?\s+ago)', snippet)
        return match.group(1) if match else 'Unknown'

class ContentAnalyzer:
    """Analyze webpage content for job-related information"""
    
    @staticmethod
    def get_job_posting_classification_prompt(content: str) -> str:
        """Generate prompt for LLM to classify job posting content"""
        return f"""Analyze this webpage content and categorize it into one of three types:

1. INDIVIDUAL JOB POSTING - Contains:
   - Details about ONE specific job role
   - Job description, responsibilities, requirements
   - Information about applying for THIS specific position
   - Company information for THIS role

2. JOB LISTING PAGE - Contains:
   - Multiple job openings
   - Links to various positions
   - General career information
   - "Browse jobs", "See all openings", "Filter positions" type content

3. NO JOB INFO - Contains:
   - No job-related information
   - Error pages, redirects, login pages
   - General company info without job details
   - Broken/empty/irrelevant content

WEBPAGE CONTENT:
{content[:3000]}...

Respond with EXACTLY ONE WORD:
- "INDIVIDUAL" if this is a single job posting
- "LISTING" if this is a jobs listing/careers page  
- "NONE" if there's no useful job information"""