"""
Job data parser for extracting structured job information from search results
"""
from typing import List, Dict, Any, Optional
from job_types import Job
from utils.text_extractors import CompanyExtractor, LocationExtractor, SalaryExtractor, TimeExtractor
from utils.hash_utils import ContentHasher
from utils.error_handling import JobParsingError

class JobParser:
    """Parser for converting search results into Job objects"""
    
    def __init__(self):
        self.company_extractor = CompanyExtractor()
        self.location_extractor = LocationExtractor()
        self.salary_extractor = SalaryExtractor()
        self.time_extractor = TimeExtractor()
        self.hasher = ContentHasher()
    
    def parse_search_results(self, search_data: Dict[str, Any]) -> List[Job]:
        """
        Parse Google Custom Search results into Job objects
        
        Args:
            search_data: Raw search results from Google Custom Search API
            
        Returns:
            List[Job]: List of parsed Job objects
            
        Raises:
            JobParsingError: If parsing fails
        """
        try:
            jobs = []
            items = search_data.get('items', [])
            
            for item in items:
                job = self._parse_single_job(item)
                if job:
                    jobs.append(job)
            
            return jobs
            
        except Exception as e:
            raise JobParsingError(f"Failed to parse search results: {str(e)}")
    
    def _parse_single_job(self, item: Dict[str, Any]) -> Optional[Job]:
        """
        Parse a single search result item into a Job object
        
        Args:
            item: Single item from search results
            
        Returns:
            Job: Parsed job object, or None if parsing fails
        """
        try:
            # Extract basic information
            title = item.get('title', '')
            snippet = item.get('snippet', '')
            link = item.get('link', '')
            display_link = item.get('displayLink', '')
            
            if not title or not link:
                return None
            
            # Extract company name
            company = self._extract_company(item, title, link, display_link)
            
            # Extract location
            location = self._extract_location(title, snippet)
            
            # Extract salary
            salary = self.salary_extractor.extract_from_snippet(snippet)
            
            # Extract posted time
            posted_time = self.time_extractor.extract_posted_time(snippet)
            
            # Extract logo URL
            logo_url = self._extract_logo_url(item)
            
            # Generate job ID
            job_id = self.hasher.generate_job_id(link)
            
            # Create job object
            job = Job(
                id=job_id,
                title=title,
                company=company,
                location=location,
                url=link,
                postedTime=posted_time,
                description=snippet,
                employmentType='Full-time',  # Default assumption
                salary=salary,
                logoUrl=logo_url
            )
            
            return job
            
        except Exception as e:
            # Log the error but don't fail the entire parsing process
            print(f"Warning: Failed to parse job item: {str(e)}")
            return None
    
    def _extract_company(self, item: Dict[str, Any], title: str, link: str, display_link: str) -> Optional[str]:
        """Extract company name using multiple strategies"""
        
        # Strategy 1: Extract from title (@ pattern)
        company = self.company_extractor.extract_from_title(title)
        if company:
            return company
        
        # Strategy 2: Extract from greenhouse URL
        company = self.company_extractor.extract_from_greenhouse_url(link)
        if company:
            return company
        
        # Strategy 3: Extract from metadata
        pagemap = item.get('pagemap', {})
        metatags = pagemap.get('metatags', [{}])
        if metatags:
            og_title = metatags[0].get('og:title', '')
            company = self.company_extractor.extract_from_metadata(og_title)
            if company:
                return company
        
        return None
    
    def _extract_location(self, title: str, snippet: str) -> Optional[str]:
        """Extract location using multiple strategies"""
        
        # Strategy 1: Extract from title patterns
        location = self.location_extractor.extract_from_title(title)
        if location:
            return location
        
        # Strategy 2: Extract from snippet
        location = self.location_extractor.extract_from_snippet(snippet)
        if location:
            return location
        
        # Strategy 3: Check for remote keyword
        if self.location_extractor.detect_remote(title):
            return 'Remote'
        
        return None
    
    def _extract_logo_url(self, item: Dict[str, Any]) -> Optional[str]:
        """Extract logo URL from pagemap"""
        pagemap = item.get('pagemap', {})
        if 'cse_image' in pagemap and len(pagemap['cse_image']) > 0:
            return pagemap['cse_image'][0].get('src')
        return None
    
    def validate_job(self, job: Job) -> bool:
        """
        Validate that a job object has required fields
        
        Args:
            job: Job object to validate
            
        Returns:
            bool: True if job is valid, False otherwise
        """
        if not job.title or not job.url:
            return False
        
        # Optional: Add more validation rules
        if len(job.title) < 3:
            return False
        
        if not job.url.startswith(('http://', 'https://')):
            return False
        
        return True