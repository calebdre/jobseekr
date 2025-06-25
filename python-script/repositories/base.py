"""
Abstract repository interface for job processing
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime
from job_types import Job

@dataclass
class ProcessedJob:
    """Domain model for processed job data"""
    job_url: str
    job_title: str
    company: Optional[str]
    location: Optional[str]
    posted_time: str
    employment_type: str
    salary: Optional[str]
    logo_url: Optional[str]
    
    # AI Analysis Results
    recommendation: str  # 'apply', 'maybe', 'skip'
    confidence: int      # 1-5
    fit_score: int       # 1-5
    analysis_json: Dict[str, Any]
    
    # Metadata
    processed_at: datetime
    content_hash: str
    processing_version: str = "1.0"
    
    @classmethod
    def from_job_and_analysis(cls, job: Job, analysis: Dict[str, Any], content_hash: str) -> 'ProcessedJob':
        """Factory method to create ProcessedJob from Job and AI analysis"""
        return cls(
            job_url=job.url,
            job_title=job.title,
            company=job.company,
            location=job.location,
            posted_time=job.postedTime,
            employment_type=job.employmentType,
            salary=job.salary,
            logo_url=job.logoUrl,
            recommendation=analysis.get('recommendation'),
            confidence=analysis.get('confidence'),
            fit_score=analysis.get('fit_score'),
            analysis_json=analysis,
            processed_at=datetime.now(),
            content_hash=content_hash
        )

class JobRepository(ABC):
    """Abstract interface for job data persistence"""
    
    @abstractmethod
    def is_job_processed(self, job_url: str) -> bool:
        """Check if a job has been processed"""
        pass
    
    @abstractmethod
    def save_processed_job(self, processed_job: ProcessedJob) -> None:
        """Save a processed job"""
        pass
    
    @abstractmethod
    def get_processed_job(self, job_url: str) -> Optional[ProcessedJob]:
        """Retrieve a specific processed job"""
        pass
    
    @abstractmethod
    def get_processed_jobs(self, 
                          recommendation: Optional[str] = None,
                          limit: Optional[int] = None,
                          offset: int = 0) -> List[ProcessedJob]:
        """Retrieve processed jobs with optional filtering"""
        pass
    
    @abstractmethod
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get statistics about processed jobs"""
        pass
    
    @abstractmethod
    def has_content_changed(self, job_url: str, current_content_hash: str) -> bool:
        """Check if job content has changed since last processing"""
        pass
    
    @abstractmethod
    def close(self) -> None:
        """Clean up resources"""
        pass