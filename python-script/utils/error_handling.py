"""
Custom exception classes for jobseekr application
"""

class JobSeekrError(Exception):
    """Base exception class for all jobseekr errors"""
    pass

class APIError(JobSeekrError):
    """Base class for API-related errors"""
    pass

class SearchAPIError(APIError):
    """Error with Google Custom Search API"""
    pass

class ContentFetchError(APIError):
    """Error fetching content from Jina AI"""
    pass

class AIAnalysisError(JobSeekrError):
    """Error with AI analysis (Ollama/Anthropic)"""
    pass

class JobParsingError(JobSeekrError):
    """Error parsing job data from search results"""
    pass

class DatabaseError(JobSeekrError):
    """Error with database operations"""
    pass

class ConfigurationError(JobSeekrError):
    """Error with configuration or missing settings"""
    pass