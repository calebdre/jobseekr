"""
Configuration management for jobseekr
"""
import os
import json
from typing import Dict, Any, Optional

class Config:
    """Configuration manager for jobseekr"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.config_file = config_file or 'config.json'
        self._config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file or use defaults"""
        defaults = {
            'database': {
                'type': 'sqlite',
                'path': 'jobs.db'
            },
            'ai': {
                'provider': 'ollama',  # or 'anthropic'
                'model': 'qwen2.5:14b-instruct-q4_K_M',
                'max_tokens': 20000,
                'temperature': 0.5
            },
            'search': {
                'api_key': '',  # Will be overridden by env var
                'cx': '',  # Will be overridden by env var
                'base_url': 'https://www.googleapis.com/customsearch/v1',
                'default_date_restrict': 'd3',
                'max_results': 10
            },
            'content': {
                'base_url': 'https://r.jina.ai',
                'timeout': 30,
                'max_retries': 3
            }
        }
        
        # Try to load from file
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    file_config = json.load(f)
                    # Merge with defaults
                    defaults.update(file_config)
            except (json.JSONDecodeError, IOError):
                print(f"Warning: Could not load config from {self.config_file}, using defaults")
        
        # Override with environment variables
        self._apply_env_overrides(defaults)
        
        return defaults
    
    def _apply_env_overrides(self, config: Dict[str, Any]):
        """Apply environment variable overrides"""
        # Database config
        if os.getenv('DATABASE_TYPE'):
            config['database']['type'] = os.getenv('DATABASE_TYPE')
        if os.getenv('DATABASE_PATH'):
            config['database']['path'] = os.getenv('DATABASE_PATH')
        if os.getenv('DATABASE_URL'):
            # Parse DATABASE_URL for PostgreSQL/MySQL
            config['database']['url'] = os.getenv('DATABASE_URL')
        
        # AI config
        if os.getenv('AI_PROVIDER'):
            config['ai']['provider'] = os.getenv('AI_PROVIDER')
        if os.getenv('AI_MODEL'):
            config['ai']['model'] = os.getenv('AI_MODEL')
        if os.getenv('ANTHROPIC_API_KEY'):
            config['ai']['anthropic_api_key'] = os.getenv('ANTHROPIC_API_KEY')
        
        # Search API config
        if os.getenv('GOOGLE_SEARCH_API_KEY'):
            config['search']['api_key'] = os.getenv('GOOGLE_SEARCH_API_KEY')
        if os.getenv('GOOGLE_SEARCH_CX'):
            config['search']['cx'] = os.getenv('GOOGLE_SEARCH_CX')
        
        # Content service config
        if os.getenv('JINA_BASE_URL'):
            config['content']['base_url'] = os.getenv('JINA_BASE_URL')
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value using dot notation"""
        keys = key.split('.')
        value = self._config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def get_database_config(self) -> Dict[str, Any]:
        """Get database configuration"""
        return self._config.get('database', {})
    
    def get_ai_config(self) -> Dict[str, Any]:
        """Get AI configuration"""
        return self._config.get('ai', {})
    
    def get_search_config(self) -> Dict[str, Any]:
        """Get search configuration"""
        return self._config.get('search', {})
    
    def get_content_config(self) -> Dict[str, Any]:
        """Get content service configuration"""
        return self._config.get('content', {})
    
    def get_search_api_key(self) -> str:
        """Get Google Search API key"""
        return self.get('search.api_key', '')
    
    def get_search_cx(self) -> str:
        """Get Google Search CX"""
        return self.get('search.cx', '')
    
    def save(self):
        """Save current configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self._config, f, indent=2)
        except IOError as e:
            print(f"Warning: Could not save config to {self.config_file}: {e}")

# Global config instance
config = Config()