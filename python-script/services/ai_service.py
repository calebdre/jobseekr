"""
AI service abstraction for job analysis using different AI backends
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from enum import Enum
import json
from ollama import chat
from utils.error_handling import AIAnalysisError

class AIBackend(Enum):
    """Supported AI backends"""
    OLLAMA = "ollama"
    ANTHROPIC = "anthropic"

class AnalysisType(Enum):
    """Types of AI analysis"""
    JOB_POSTING_CLASSIFICATION = "job_posting_classification"
    JOB_FIT_ANALYSIS = "job_fit_analysis"

class AIService(ABC):
    """Abstract base class for AI services"""
    
    @abstractmethod
    def analyze_content(self, content: str, analysis_type: AnalysisType, **kwargs) -> str:
        """Analyze content using AI"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if the AI service is available"""
        pass

class OllamaService(AIService):
    """AI service implementation using Ollama"""
    
    def __init__(self, classification_model: str = "qwen2.5:14b-instruct-q4_K_M", 
                 fit_analysis_model: str = "mistral-small:24b"):
        self.classification_model = classification_model
        self.fit_analysis_model = fit_analysis_model
    
    def analyze_content(self, content: str, analysis_type: AnalysisType, **kwargs) -> str:
        """
        Analyze content using Ollama
        
        Args:
            content: Content to analyze
            analysis_type: Type of analysis to perform
            **kwargs: Additional parameters for the analysis
            
        Returns:
            str: Analysis result
            
        Raises:
            AIAnalysisError: If analysis fails
        """
        try:
            if analysis_type == AnalysisType.JOB_POSTING_CLASSIFICATION:
                prompt = self._get_classification_prompt(content)
                model = self.classification_model
            elif analysis_type == AnalysisType.JOB_FIT_ANALYSIS:
                prompt = self._get_fit_analysis_prompt(content, **kwargs)
                model = self.fit_analysis_model
            else:
                raise AIAnalysisError(f"Unsupported analysis type: {analysis_type}")
            
            response = chat(
                model=model,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return response.message.content
            
        except Exception as e:
            raise AIAnalysisError(f"Ollama analysis failed: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if Ollama is available"""
        try:
            # Test with classification model as it's used first
            response = chat(
                model=self.classification_model,
                messages=[{"role": "user", "content": "test"}]
            )
            return True
        except Exception:
            return False
    
    def _get_classification_prompt(self, content: str) -> str:
        """Generate prompt for job posting classification"""
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
    
    def _get_fit_analysis_prompt(self, content: str, resume: str, preferences: str) -> str:
        """Generate prompt for job fit analysis"""
        return f"""You are a job application advisor helping evaluate whether a job posting is a good fit based on a resume and specific preferences.

**RESUME:**
{resume}

**JOB POSTING:**
{content}

**PREFERENCES:**
{preferences}

**TASK:**
Analyze this job posting against the resume and preferences. Provide a structured evaluation to help decide whether to apply.

**SCORING GUIDE:**
- Confidence (1-5): How certain are you about this recommendation?
- Fit Score (1-5): Overall match between candidate and role
  - 5: Excellent fit, strong match on most criteria
  - 4: Good fit, matches well with minor gaps
  - 3: Decent fit, some alignment but notable gaps
  - 2: Poor fit, significant mismatches
  - 1: Very poor fit, major misalignment

**RECOMMENDATIONS:**
- "apply": Strong fit, few concerns, aligns well with preferences
- "maybe": Decent fit but has concerns or gaps worth considering
- "skip": Poor fit, major red flags, or doesn't meet key preferences

Output your analysis in this exact JSON format:

{{
  "recommendation": "apply" | "maybe" | "skip",
  "confidence": 1-5,
  "fit_score": 1-5,
  "summary": {{
    "role": "exact role title",
    "company": "company name",
    "location": "location/remote status",
    "salary_range": "salary if mentioned, or 'Not specified'",
    "key_technologies": ["list", "of", "main", "technologies"]
  }},
  "job_summary": "2-4 sentence description of what this role involves, the main responsibilities, the company, and how the role impacts the company",
  "fit_summary": "2-3 sentence summary of why this would or wouldn't be a good fit based on the resume and preferences",
  "why_good_fit": [
    "specific reasons why this matches well"
  ],
  "potential_concerns": [
    "specific concerns or red flags about this role"
  ]
}}

Focus on practical fit assessment. Consider technical skills match, seniority level, company preferences, location/remote requirements, and any red flags in the job posting quality or requirements."""

class AnthropicService(AIService):
    """AI service implementation using Anthropic Claude"""
    
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        import anthropic
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model
    
    def analyze_content(self, content: str, analysis_type: AnalysisType, **kwargs) -> str:
        """
        Analyze content using Anthropic Claude
        
        Args:
            content: Content to analyze
            analysis_type: Type of analysis to perform
            **kwargs: Additional parameters for the analysis
            
        Returns:
            str: Analysis result
            
        Raises:
            AIAnalysisError: If analysis fails
        """
        try:
            if analysis_type == AnalysisType.JOB_POSTING_CLASSIFICATION:
                prompt = self._get_classification_prompt(content)
            elif analysis_type == AnalysisType.JOB_FIT_ANALYSIS:
                prompt = self._get_fit_analysis_prompt(content, **kwargs)
            else:
                raise AIAnalysisError(f"Unsupported analysis type: {analysis_type}")
            
            message = self.client.beta.messages.create(
                model=self.model,
                max_tokens=20000,
                temperature=0.5,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return message.content
            
        except Exception as e:
            raise AIAnalysisError(f"Anthropic analysis failed: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if Anthropic is available"""
        try:
            message = self.client.beta.messages.create(
                model=self.model,
                max_tokens=10,
                messages=[{"role": "user", "content": "test"}]
            )
            return True
        except Exception:
            return False
    
    def _get_classification_prompt(self, content: str) -> str:
        """Generate prompt for job posting classification"""
        return OllamaService()._get_classification_prompt(content)
    
    def _get_fit_analysis_prompt(self, content: str, resume: str, preferences: str) -> str:
        """Generate prompt for job fit analysis"""
        return OllamaService()._get_fit_analysis_prompt(content, resume, preferences)

class AIServiceFactory:
    """Factory for creating AI service instances"""
    
    @staticmethod
    def create(backend: AIBackend, **kwargs) -> AIService:
        """
        Create an AI service instance
        
        Args:
            backend: The AI backend to use
            **kwargs: Backend-specific configuration
            
        Returns:
            AIService: Configured AI service instance
        """
        if backend == AIBackend.OLLAMA:
            classification_model = kwargs.get('classification_model', 'qwen2.5:14b-instruct-q4_K_M')
            fit_analysis_model = kwargs.get('fit_analysis_model', 'mistral-small:24b')
            return OllamaService(classification_model=classification_model, fit_analysis_model=fit_analysis_model)
        elif backend == AIBackend.ANTHROPIC:
            api_key = kwargs.get('api_key')
            model = kwargs.get('model', 'claude-sonnet-4-20250514')
            if not api_key:
                raise AIAnalysisError("Anthropic API key is required")
            return AnthropicService(api_key=api_key, model=model)
        else:
            raise AIAnalysisError(f"Unsupported backend: {backend}")

def clean_json_response(response: str) -> str:
    """Clean JSON response by removing markdown formatting"""
    return response.replace("```json", "").replace("```", "").strip()