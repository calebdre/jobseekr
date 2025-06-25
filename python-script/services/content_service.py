"""
Content fetching service using Jina AI reader API
"""
import requests
from typing import Optional
import time
from utils.error_handling import ContentFetchError

class ContentService:
    """Service for fetching webpage content via Jina AI"""
    
    def __init__(self, base_url: str = "https://r.jina.ai", timeout: int = 30, max_retries: int = 3):
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
    
    def fetch_content(self, url: str) -> Optional[str]:
        """
        Fetch content from a URL using Jina AI reader
        
        Args:
            url: The URL to fetch content from
            
        Returns:
            str: The fetched content, or None if failed
            
        Raises:
            ContentFetchError: If content fetching fails after retries
        """
        jina_url = f"{self.base_url}/{url}"
        
        for attempt in range(self.max_retries):
            try:
                response = requests.get(jina_url, timeout=self.timeout)
                
                if response.status_code == 200:
                    return response.text
                elif response.status_code == 429:  # Rate limited
                    if attempt < self.max_retries - 1:
                        wait_time = (attempt + 1) * 2  # Exponential backoff
                        time.sleep(wait_time)
                        continue
                    else:
                        raise ContentFetchError(f"Rate limited after {self.max_retries} attempts")
                else:
                    raise ContentFetchError(f"HTTP {response.status_code}: {response.text}")
                    
            except requests.exceptions.Timeout:
                if attempt < self.max_retries - 1:
                    continue
                else:
                    raise ContentFetchError(f"Timeout after {self.max_retries} attempts")
            except requests.exceptions.RequestException as e:
                if attempt < self.max_retries - 1:
                    continue
                else:
                    raise ContentFetchError(f"Request failed: {str(e)}")
        
        return None
    
    def is_content_available(self, url: str) -> bool:
        """
        Check if content is available without fetching the full content
        
        Args:
            url: The URL to check
            
        Returns:
            bool: True if content is available, False otherwise
        """
        try:
            jina_url = f"{self.base_url}/{url}"
            response = requests.head(jina_url, timeout=5)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False