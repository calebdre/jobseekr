"""
Peewee models for job processing database
"""
from peewee import *
from datetime import datetime
import json
from typing import Dict, Any

# Database proxy - will be initialized by the repository
database_proxy = DatabaseProxy()

class BaseModel(Model):
    """Base model with common functionality"""
    class Meta:
        database = database_proxy

class ProcessedJobModel(BaseModel):
    """Peewee model for processed job data"""
    
    # Job basic info
    job_url = CharField(unique=True, max_length=500, index=True)
    job_title = CharField(max_length=200)
    company = CharField(max_length=100, null=True)
    location = CharField(max_length=100, null=True)
    posted_time = CharField(max_length=50)
    employment_type = CharField(max_length=50, default='Full-time')
    salary = CharField(max_length=100, null=True)
    logo_url = CharField(max_length=500, null=True)
    
    # AI Analysis Results
    recommendation = CharField(
        max_length=10, 
        choices=[('apply', 'Apply'), ('maybe', 'Maybe'), ('skip', 'Skip')],
        index=True
    )
    confidence = IntegerField(constraints=[Check('confidence >= 1 AND confidence <= 5')])
    fit_score = IntegerField(constraints=[Check('fit_score >= 1 AND fit_score <= 5')])
    analysis_json = TextField()  # JSON string of full analysis
    
    # Metadata
    processed_at = DateTimeField(default=datetime.now, index=True)
    content_hash = CharField(max_length=64)  # SHA-256 hash
    processing_version = CharField(max_length=10, default='1.0')
    
    class Meta:
        table_name = 'processed_jobs'
        indexes = (
            # Compound indexes for common queries
            (('recommendation', 'processed_at'), False),
            (('job_url', 'content_hash'), True),  # Unique constraint
        )
    
    def get_analysis_dict(self) -> Dict[str, Any]:
        """Parse analysis JSON to dictionary"""
        try:
            return json.loads(self.analysis_json)
        except json.JSONDecodeError:
            return {}
    
    def set_analysis_dict(self, analysis: Dict[str, Any]) -> None:
        """Set analysis from dictionary"""
        self.analysis_json = json.dumps(analysis)
    
    def __str__(self):
        return f"{self.job_title} at {self.company or 'Unknown'} - {self.recommendation}"

# List of all models for easy reference
MODELS = [ProcessedJobModel]