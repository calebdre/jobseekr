"""
Peewee ORM implementation of JobRepository
"""
from peewee import *
from typing import Optional, Dict, Any, List
from datetime import datetime

from .base import JobRepository, ProcessedJob
from .models import ProcessedJobModel, database_proxy, MODELS

class PeeweeJobRepository(JobRepository):
    """Peewee ORM implementation of JobRepository"""
    
    def __init__(self, database_config: Dict[str, Any]):
        """
        Initialize repository with database configuration
        
        Args:
            database_config: Database configuration dict with keys:
                - type: 'sqlite', 'postgresql', 'mysql'
                - path/host: database path or host
                - Additional connection parameters
        """
        self.db = self._create_database(database_config)
        database_proxy.initialize(self.db)
        self._create_tables()
    
    def _create_database(self, config: Dict[str, Any]) -> Database:
        """Create database instance based on configuration"""
        db_type = config.get('type', 'sqlite').lower()
        
        if db_type == 'sqlite':
            return SqliteDatabase(config.get('path', 'jobs.db'))
        elif db_type == 'postgresql':
            return PostgresqlDatabase(
                config['database'],
                host=config.get('host', 'localhost'),
                port=config.get('port', 5432),
                user=config.get('user'),
                password=config.get('password')
            )
        elif db_type == 'mysql':
            return MySQLDatabase(
                config['database'],
                host=config.get('host', 'localhost'),
                port=config.get('port', 3306),
                user=config.get('user'),
                password=config.get('password')
            )
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
    
    def _create_tables(self):
        """Create database tables if they don't exist"""
        with self.db:
            self.db.create_tables(MODELS, safe=True)
    
    def is_job_processed(self, job_url: str) -> bool:
        """Check if a job has been processed"""
        try:
            return ProcessedJobModel.select().where(
                ProcessedJobModel.job_url == job_url
            ).exists()
        except Exception:
            return False
    
    def save_processed_job(self, processed_job: ProcessedJob) -> None:
        """Save a processed job"""
        model_data = {
            'job_url': processed_job.job_url,
            'job_title': processed_job.job_title,
            'company': processed_job.company,
            'location': processed_job.location,
            'posted_time': processed_job.posted_time,
            'employment_type': processed_job.employment_type,
            'salary': processed_job.salary,
            'logo_url': processed_job.logo_url,
            'recommendation': processed_job.recommendation,
            'confidence': processed_job.confidence,
            'fit_score': processed_job.fit_score,
            'processed_at': processed_job.processed_at,
            'content_hash': processed_job.content_hash,
            'processing_version': processed_job.processing_version
        }
        
        # Create model instance and set analysis JSON
        model = ProcessedJobModel(**model_data)
        model.set_analysis_dict(processed_job.analysis_json)
        
        # Use replace to handle duplicates
        try:
            model.save(force_insert=False)
        except IntegrityError:
            # If URL already exists, update it
            ProcessedJobModel.replace(**model_data, 
                                    analysis_json=model.analysis_json).execute()
    
    def get_processed_job(self, job_url: str) -> Optional[ProcessedJob]:
        """Retrieve a specific processed job"""
        try:
            model = ProcessedJobModel.get(ProcessedJobModel.job_url == job_url)
            return self._model_to_processed_job(model)
        except ProcessedJobModel.DoesNotExist:
            return None
    
    def get_processed_jobs(self, 
                          recommendation: Optional[str] = None,
                          limit: Optional[int] = None,
                          offset: int = 0) -> List[ProcessedJob]:
        """Retrieve processed jobs with optional filtering"""
        query = ProcessedJobModel.select().order_by(ProcessedJobModel.processed_at.desc())
        
        if recommendation:
            query = query.where(ProcessedJobModel.recommendation == recommendation)
        
        if limit:
            query = query.limit(limit).offset(offset)
        
        return [self._model_to_processed_job(model) for model in query]
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get statistics about processed jobs"""
        try:
            # Total count
            total = ProcessedJobModel.select().count()
            
            # Counts by recommendation
            apply_count = ProcessedJobModel.select().where(
                ProcessedJobModel.recommendation == 'apply'
            ).count()
            
            maybe_count = ProcessedJobModel.select().where(
                ProcessedJobModel.recommendation == 'maybe'
            ).count()
            
            skip_count = ProcessedJobModel.select().where(
                ProcessedJobModel.recommendation == 'skip'
            ).count()
            
            # Average scores
            avg_fit_score = ProcessedJobModel.select(
                fn.AVG(ProcessedJobModel.fit_score)
            ).scalar() or 0
            
            avg_confidence = ProcessedJobModel.select(
                fn.AVG(ProcessedJobModel.confidence)
            ).scalar() or 0
            
            return {
                'total': total,
                'apply_count': apply_count,
                'maybe_count': maybe_count,
                'skip_count': skip_count,
                'avg_fit_score': round(float(avg_fit_score), 2),
                'avg_confidence': round(float(avg_confidence), 2)
            }
        except Exception:
            return {
                'total': 0,
                'apply_count': 0,
                'maybe_count': 0,
                'skip_count': 0,
                'avg_fit_score': 0.0,
                'avg_confidence': 0.0
            }
    
    def has_content_changed(self, job_url: str, current_content_hash: str) -> bool:
        """Check if job content has changed since last processing"""
        try:
            existing = ProcessedJobModel.get(ProcessedJobModel.job_url == job_url)
            return existing.content_hash != current_content_hash
        except ProcessedJobModel.DoesNotExist:
            return True  # Job not processed yet, so content is "changed"
    
    def close(self) -> None:
        """Clean up resources"""
        if not self.db.is_closed():
            self.db.close()
    
    def _model_to_processed_job(self, model: ProcessedJobModel) -> ProcessedJob:
        """Convert Peewee model to ProcessedJob domain object"""
        return ProcessedJob(
            job_url=model.job_url,
            job_title=model.job_title,
            company=model.company,
            location=model.location,
            posted_time=model.posted_time,
            employment_type=model.employment_type,
            salary=model.salary,
            logo_url=model.logo_url,
            recommendation=model.recommendation,
            confidence=model.confidence,
            fit_score=model.fit_score,
            analysis_json=model.get_analysis_dict(),
            processed_at=model.processed_at,
            content_hash=model.content_hash,
            processing_version=model.processing_version
        )