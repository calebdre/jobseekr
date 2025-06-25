"""
Content hashing utilities for change detection
"""
import hashlib
from typing import Optional

class ContentHasher:
    """Utilities for generating content hashes"""
    
    @staticmethod
    def sha256_hash(content: str) -> str:
        """Generate SHA-256 hash of content"""
        return hashlib.sha256(content.encode()).hexdigest()
    
    @staticmethod
    def md5_hash(content: str) -> str:
        """Generate MD5 hash of content"""
        return hashlib.md5(content.encode()).hexdigest()
    
    @staticmethod
    def generate_job_id(url: str) -> str:
        """Generate job ID from URL using MD5 hash"""
        return hashlib.md5(url.encode()).hexdigest()[:12]
    
    @staticmethod
    def compare_content_hashes(hash1: Optional[str], hash2: Optional[str]) -> bool:
        """Compare two content hashes, handling None values"""
        if hash1 is None or hash2 is None:
            return False
        return hash1 == hash2