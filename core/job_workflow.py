"""
Main job processing workflow orchestration
"""
from typing import List, Optional
import json
import tqdm
from job_types import Job
from repositories.base import ProcessedJob, JobRepository
from services.search_service import SearchService
from services.ai_service import AIService, AnalysisType
from parsers.job_parser import JobParser
from parsers.content_analyzer import ContentAnalyzer, JobPostingType
from utils.error_handling import JobSeekrError
from data import RESUME, PREFERENCES

class JobWorkflow:
    """Main workflow orchestrator for job search and processing"""
    
    def __init__(
        self,
        search_service: SearchService,
        ai_service: AIService,
        job_parser: JobParser,
        content_analyzer: ContentAnalyzer,
        repository: JobRepository
    ):
        self.search_service = search_service
        self.ai_service = ai_service
        self.job_parser = job_parser
        self.content_analyzer = content_analyzer
        self.repository = repository
    
    def search_and_process_jobs(self, search_term: str, date_restrict: Optional[str] = None) -> List[Job]:
        """
        Complete workflow: search, parse, filter, and process jobs
        
        Args:
            search_term: Search term to query for
            date_restrict: Optional date restriction (e.g., 'd3' for last 3 days)
            
        Returns:
            List[Job]: List of successfully processed jobs
        """
        try:
            # Step 1: Search for jobs
            print(f"🔍 Searching for jobs: {search_term}")
            search_results = self.search_service.search_jobs(search_term, date_restrict)
            
            # Step 2: Parse search results into Job objects
            print("📝 Parsing search results...")
            jobs = self.job_parser.parse_search_results(search_results)
            print(f"Found {len(jobs)} job listings")
            
            # Step 3: Process jobs
            processed_jobs = self._process_jobs(jobs)
            
            # Step 4: Show summary
            self._show_summary(processed_jobs)
            
            return processed_jobs
            
        except Exception as e:
            print(f"❌ Workflow failed: {str(e)}")
            raise JobSeekrError(f"Job workflow failed: {str(e)}")
    
    def _process_jobs(self, jobs: List[Job]) -> List[Job]:
        """
        Process a list of jobs through the complete pipeline
        
        Args:
            jobs: List of Job objects to process
            
        Returns:
            List[Job]: List of successfully processed jobs
        """
        processed_jobs = []
        
        print(f"\\n🔄 Processing {len(jobs)} jobs...")
        
        for job in tqdm.tqdm(jobs, desc="Processing jobs"):
            try:
                # Skip if already processed
                if self.repository.is_job_processed(job.url):
                    print(f"Already processed: {job.title}")
                    continue
                
                # Analyze content and check if it's an individual job posting
                print(f"Analyzing: {job.title}")
                content, posting_type = self.content_analyzer.analyze_job_posting(job.url)
                
                if posting_type != JobPostingType.INDIVIDUAL:
                    print(f"❌ Skipping {job.title} - {posting_type.value}")
                    continue
                
                print(f"✅ Processing {job.title}")
                
                # Generate content hash for change detection
                content_hash = self.content_analyzer.generate_content_hash(content)
                
                # Check if content has changed (commented out for now)
                # if not self.repository.has_content_changed(job.url, content_hash):
                #     print(f"Content unchanged: {job.title}")
                #     continue
                
                # Analyze job fit with AI
                analysis = self.content_analyzer.analyze_job_fit(content, RESUME, PREFERENCES)
                if not analysis:
                    print(f"AI analysis failed: {job.title}")
                    continue
                
                # Save to database
                processed_job = ProcessedJob.from_job_and_analysis(job, analysis, content_hash)
                self.repository.save_processed_job(processed_job)
                
                print(f"✓ {job.title} - {analysis['recommendation']} (fit: {analysis['fit_score']})")
                processed_jobs.append(job)
                
            except json.JSONDecodeError as e:
                print(f"Failed to parse AI response for {job.title}: {e}")
                continue
            except Exception as e:
                print(f"Error processing {job.title}: {str(e)}")
                continue
        
        return processed_jobs
    
    def _show_summary(self, processed_jobs: List[Job]) -> None:
        """
        Show processing summary and database statistics
        
        Args:
            processed_jobs: List of jobs that were successfully processed
        """
        print(f"\\n✓ Successfully processed {len(processed_jobs)} new jobs")
        
        # Show database statistics
        try:
            stats = self.repository.get_processing_stats()
            print(f"Database totals - Apply: {stats['apply_count']}, "
                  f"Maybe: {stats['maybe_count']}, Skip: {stats['skip_count']}")
        except Exception as e:
            print(f"Could not retrieve database stats: {e}")
    
    def reprocess_job(self, job_url: str) -> bool:
        """
        Reprocess a single job by URL
        
        Args:
            job_url: URL of the job to reprocess
            
        Returns:
            bool: True if reprocessing was successful
        """
        try:
            # Analyze content
            content, posting_type = self.content_analyzer.analyze_job_posting(job_url)
            
            if posting_type != JobPostingType.INDIVIDUAL:
                print(f"❌ URL is not an individual job posting: {posting_type.value}")
                return False
            
            # Create a minimal job object for processing
            job = Job(
                id="reprocess",
                title="Reprocessed Job",
                url=job_url,
                description="Reprocessing existing job",
                postedTime="Unknown"
            )
            
            # Analyze job fit
            analysis = self.content_analyzer.analyze_job_fit(content, RESUME, PREFERENCES)
            if not analysis:
                print("❌ AI analysis failed")
                return False
            
            # Generate content hash
            content_hash = self.content_analyzer.generate_content_hash(content)
            
            # Save to database
            processed_job = ProcessedJob.from_job_and_analysis(job, analysis, content_hash)
            self.repository.save_processed_job(processed_job)
            
            print(f"✓ Reprocessed job - {analysis['recommendation']} (fit: {analysis['fit_score']})")
            return True
            
        except Exception as e:
            print(f"❌ Reprocessing failed: {str(e)}")
            return False
    
    def get_repository_stats(self) -> dict:
        """Get repository statistics"""
        return self.repository.get_processing_stats()
    
    def close(self) -> None:
        """Clean up resources"""
        self.repository.close()