"""
Google Custom Search API service for job searching
"""
import requests
import urllib.parse
from typing import Dict, Any, Optional
from utils.error_handling import SearchAPIError

class SearchService:
    """Service for interacting with Google Custom Search API"""
    
    def __init__(self, api_key: str, cx: str, base_url: str = "https://www.googleapis.com/customsearch/v1"):
        self.api_key = api_key
        self.cx = cx
        self.base_url = base_url
    
    def search(self, query: str, **kwargs) -> Dict[str, Any]:
        """
        Search for jobs using Google Custom Search API
        
        Args:
            query: Search term to query for
            **kwargs: Additional search parameters (sort, dateRestrict, etc.)
            
        Returns:
            Dict containing the search results
            
        Raises:
            SearchAPIError: If the search request fails
        """
        params = {
            'key': self.api_key,
            'cx': self.cx,
            'q': query,
            **kwargs
        }
        
        # Add default parameters if not specified
        if 'sort' not in params:
            params['sort'] = 'date'
        
        try:
            # Construct URL with proper encoding
            query_string = '&'.join([f'{k}={urllib.parse.quote(str(v))}' for k, v in params.items()])
            url = f'{self.base_url}?{query_string}'
            
            # Make the request
            response = requests.get(url)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 400:
                raise SearchAPIError(f"Bad request: {response.text}")
            elif response.status_code == 403:
                raise SearchAPIError(f"API key or quota issue: {response.text}")
            elif response.status_code == 429:
                raise SearchAPIError(f"Rate limited: {response.text}")
            else:
                raise SearchAPIError(f"HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            raise SearchAPIError(f"Request failed: {str(e)}")
    
    def search_jobs(self, search_term: str, date_restrict: Optional[str] = None) -> Dict[str, Any]:
        """
        Convenience method for searching jobs with common parameters
        
        Args:
            search_term: The job search term
            date_restrict: Date restriction (e.g., 'd3' for last 3 days)
            
        Returns:
            Dict containing the search results
        """
        params = {}
        if date_restrict:
            params['dateRestrict'] = date_restrict
        
        return self.search(search_term, **params)
    
    def validate_credentials(self) -> bool:
        """
        Validate API credentials by making a simple test request
        
        Returns:
            bool: True if credentials are valid, False otherwise
        """
        try:
            # Make a minimal test request
            result = self.search("test", num=1)
            return 'items' in result or 'searchInformation' in result
        except SearchAPIError:
            return False