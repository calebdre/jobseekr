"""
JobSeekr - AI-powered job search and analysis tool (Refactored)

This is the new main entry point using the refactored architecture.
"""
from services.search_service import SearchService
from services.content_service import ContentService
from services.ai_service import AIServiceFactory, AIBackend
from parsers.job_parser import JobParser
from parsers.content_analyzer import ContentAnalyzer
from core.job_workflow import JobWorkflow
from repositories.factory import RepositoryFactory
from config import config
from utils.error_handling import JobSeekrError, ConfigurationError

def create_workflow() -> JobWorkflow:
    """
    Create and configure the job workflow with all dependencies
    
    Returns:
        JobWorkflow: Configured workflow instance
        
    Raises:
        ConfigurationError: If configuration is invalid
    """
    try:
        # Get configuration
        search_config = config.get_search_config()
        ai_config = config.get_ai_config()
        content_config = config.get_content_config()
        db_config = config.get_database_config()
        
        # Validate required configuration
        api_key = search_config.get('api_key') or 'AIzaSyBZ8z92vQwxxsXEwKl2p3T_4Px-TaCqSkM'
        cx = search_config.get('cx') or '04e65784d460647ab'
        
        if not api_key or not cx:
            raise ConfigurationError("Google Search API key and CX are required")
        
        # Create services
        search_service = SearchService(
            api_key=api_key,
            cx=cx,
            base_url=search_config.get('base_url', 'https://www.googleapis.com/customsearch/v1')
        )
        
        content_service = ContentService(
            base_url=content_config.get('base_url', 'https://r.jina.ai'),
            timeout=content_config.get('timeout', 30),
            max_retries=content_config.get('max_retries', 3)
        )
        
        # Create AI service
        ai_backend = AIBackend.OLLAMA if ai_config.get('provider') == 'ollama' else AIBackend.ANTHROPIC
        ai_service_kwargs = {'model': ai_config.get('model', 'qwen2.5:14b-instruct-q4_K_M')}
        
        if ai_backend == AIBackend.ANTHROPIC:
            anthropic_key = ai_config.get('anthropic_api_key')
            if not anthropic_key:
                raise ConfigurationError("Anthropic API key is required when using Anthropic backend")
            ai_service_kwargs['api_key'] = anthropic_key
        
        ai_service = AIServiceFactory.create(ai_backend, **ai_service_kwargs)
        
        # Create parsers
        job_parser = JobParser()
        content_analyzer = ContentAnalyzer(ai_service, content_service)
        
        # Create repository
        repository = RepositoryFactory.create('peewee', database_config=db_config)
        
        # Create workflow
        workflow = JobWorkflow(
            search_service=search_service,
            ai_service=ai_service,
            job_parser=job_parser,
            content_analyzer=content_analyzer,
            repository=repository
        )
        
        return workflow
        
    except Exception as e:
        raise ConfigurationError(f"Failed to create workflow: {str(e)}")

def main():
    """Main entry point"""
    try:
        print("🚀 Starting JobSeekr (Refactored)...")
        
        # Create workflow
        workflow = create_workflow()
        
        try:
            # Process jobs
            print("🔍 Searching for Software Engineer (Remote) jobs...")
            processed_jobs = workflow.search_and_process_jobs('Software engineer (remote)')
            print(f'\\n✅ Successfully processed {len(processed_jobs)} new jobs')
            
        finally:
            # Clean up
            workflow.close()
            
    except JobSeekrError as e:
        print(f"❌ JobSeekr error: {e}")
        exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        exit(1)

if __name__ == '__main__':
    main()