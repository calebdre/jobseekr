"""
Content analyzer for determining job posting types and analyzing content
"""
from typing import Optional, Dict, Any
from enum import Enum
import json
from services.ai_service import AIService, AnalysisType
from services.content_service import ContentService
from utils.error_handling import AIAnalysisError, ContentFetchError
from utils.hash_utils import ContentHasher

class JobPostingType(Enum):
    """Types of job posting content"""
    INDIVIDUAL = "individual"
    LISTING = "listing"
    NONE = "none"

class ContentAnalyzer:
    """Analyzer for job posting content using AI"""
    
    def __init__(self, ai_service: AIService, content_service: ContentService):
        self.ai_service = ai_service
        self.content_service = content_service
        self.hasher = ContentHasher()
    
    def analyze_job_posting(self, url: str) -> tuple[Optional[str], JobPostingType]:
        """
        Analyze a URL to determine if it contains an individual job posting
        
        Args:
            url: URL to analyze
            
        Returns:
            tuple: (content, posting_type) where content is the page content if it's
                   an individual job posting, None otherwise; posting_type indicates
                   the type of content found
        """
        try:
            # Fetch content
            content = self.content_service.fetch_content(url)
            if not content:
                return None, JobPostingType.NONE
            
            # Analyze content with AI
            analysis_result = self.ai_service.analyze_content(
                content, 
                AnalysisType.JOB_POSTING_CLASSIFICATION
            )
            
            # Parse result
            result_upper = analysis_result.strip().upper()
            
            if "INDIVIDUAL" in result_upper:
                return content, JobPostingType.INDIVIDUAL
            elif "LISTING" in result_upper:
                return None, JobPostingType.LISTING
            elif "NONE" in result_upper:
                return None, JobPostingType.NONE
            else:
                # Unclear response, treat as non-individual
                return None, JobPostingType.NONE
                
        except ContentFetchError as e:
            print(f"  ❌ Content fetch failed: {e}")
            return None, JobPostingType.NONE
        except AIAnalysisError as e:
            print(f"  ❌ AI analysis failed: {e}")
            return None, JobPostingType.NONE
        except Exception as e:
            print(f"  ❌ Unexpected error: {e}")
            return None, JobPostingType.NONE
    
    def analyze_job_fit(self, content: str, resume: str, preferences: str) -> Optional[Dict[str, Any]]:
        """
        Analyze job fit using AI
        
        Args:
            content: Job posting content
            resume: Candidate resume
            preferences: Job preferences
            
        Returns:
            Dict containing the analysis results, or None if analysis fails
        """
        try:
            analysis_result = self.ai_service.analyze_content(
                content,
                AnalysisType.JOB_FIT_ANALYSIS,
                resume=resume,
                preferences=preferences
            )
            
            # Clean and parse JSON response
            cleaned_result = self._clean_json_response(analysis_result)
            return json.loads(cleaned_result)
            
        except json.JSONDecodeError as e:
            print(f"  ❌ Failed to parse AI response: {e}")
            return None
        except AIAnalysisError as e:
            print(f"  ❌ AI analysis failed: {e}")
            return None
        except Exception as e:
            print(f"  ❌ Unexpected error during job fit analysis: {e}")
            return None
    
    def generate_content_hash(self, content: str) -> str:
        """Generate hash for content change detection"""
        return self.hasher.sha256_hash(content)
    
    def _clean_json_response(self, response: str) -> str:
        """Clean JSON response by removing markdown formatting"""
        return response.replace("```json", "").replace("```", "").strip()
    
    def is_content_individual_job(self, content: str) -> bool:
        """
        Quick check if content appears to be an individual job posting
        (without making AI call)
        
        Args:
            content: Content to check
            
        Returns:
            bool: True if content likely contains an individual job posting
        """
        # Simple heuristics - can be improved
        individual_indicators = [
            "job description",
            "responsibilities",
            "requirements",
            "apply now",
            "submit application",
            "job summary"
        ]
        
        listing_indicators = [
            "browse jobs",
            "see all openings",
            "filter positions",
            "job search",
            "view all jobs"
        ]
        
        content_lower = content.lower()
        
        individual_score = sum(1 for indicator in individual_indicators if indicator in content_lower)
        listing_score = sum(1 for indicator in listing_indicators if indicator in content_lower)
        
        return individual_score > listing_score