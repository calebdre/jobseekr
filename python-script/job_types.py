from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

@dataclass
class Job:
    """Represents a job listing from a search result."""
    id: str
    title: str
    url: str
    description: str
    postedTime: str
    company: Optional[str] = None
    location: Optional[str] = None
    employmentType: str = "Full-time"
    salary: Optional[str] = None
    logoUrl: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the Job object to a dictionary."""
        return asdict(self)
    
    def is_remote(self) -> bool:
        """Check if this is a remote job based on title or location."""
        title_lower = self.title.lower()
        location_lower = self.location.lower() if self.location else ""
        return "remote" in title_lower or "remote" in location_lower
    
    def __str__(self) -> str:
        """String representation of the job."""
        return f"{self.title} at {self.company or 'Unknown'}"


class JobEncoder(json.JSONEncoder):
    """Custom JSON encoder for Job objects."""
    def default(self, obj):
        if isinstance(obj, Job):
            return obj.to_dict()
        return super().default(obj)


def save_jobs_to_file(jobs: List[Job], filename: str) -> None:
    """Save a list of Job objects to a JSON file."""
    with open(filename, 'w') as f:
        json.dump(
            {
                "timestamp": datetime.now().isoformat(),
                "count": len(jobs),
                "jobs": jobs
            }, 
            f, 
            indent=2, 
            cls=JobEncoder
        )


def load_jobs_from_file(filename: str) -> List[Job]:
    """Load a list of Job objects from a JSON file."""
    with open(filename, 'r') as f:
        data = json.load(f)
        jobs = []
        for job_dict in data.get("jobs", []):
            jobs.append(Job(**job_dict))
        return jobs
