"""
Factory for creating repository instances
"""
from typing import Dict, Type, Any
from .base import JobRepository
from .peewee_repository import PeeweeJobRepository

class RepositoryFactory:
    """Factory for creating repository instances"""
    
    _repositories: Dict[str, Type[JobRepository]] = {
        'peewee': PeeweeJobRepository,
        'sqlite': PeeweeJobRepository,  # Alias for backward compatibility
        # Future implementations can be added here:
        # 'sqlalchemy': SQLAlchemyJobRepository,
        # 'django': DjangoJobRepository,
    }
    
    @classmethod
    def create(cls, repo_type: str = 'sqlite', **kwargs) -> JobRepository:
        """
        Create repository instance
        
        Args:
            repo_type: Type of repository ('sqlite', 'peewee', etc.)
            **kwargs: Repository-specific configuration
            
        Returns:
            JobRepository instance
            
        Example:
            # SQLite (default)
            repo = RepositoryFactory.create()
            
            # SQLite with custom path
            repo = RepositoryFactory.create('sqlite', path='custom.db')
            
            # PostgreSQL
            repo = RepositoryFactory.create('peewee', 
                database_config={
                    'type': 'postgresql',
                    'database': 'jobs',
                    'host': 'localhost',
                    'user': 'user',
                    'password': 'pass'
                })
        """
        if repo_type not in cls._repositories:
            raise ValueError(f"Unknown repository type: {repo_type}. Available: {list(cls._repositories.keys())}")
        
        repository_class = cls._repositories[repo_type]
        
        # Handle different repository configurations
        if repo_type in ['peewee', 'sqlite']:
            return cls._create_peewee_repository(repository_class, **kwargs)
        else:
            return repository_class(**kwargs)
    
    @classmethod
    def _create_peewee_repository(cls, repository_class: Type[JobRepository], **kwargs) -> JobRepository:
        """Create Peewee repository with proper configuration"""
        # If database_config is provided, use it directly
        if 'database_config' in kwargs:
            return repository_class(kwargs['database_config'])
        
        # Otherwise, build config from individual parameters
        config = {
            'type': kwargs.get('type', 'sqlite'),
            'path': kwargs.get('path', 'jobs.db'),
        }
        
        # Add PostgreSQL/MySQL specific config
        if config['type'] in ['postgresql', 'mysql']:
            config.update({
                'database': kwargs.get('database'),
                'host': kwargs.get('host', 'localhost'),
                'port': kwargs.get('port'),
                'user': kwargs.get('user'),
                'password': kwargs.get('password')
            })
        
        return repository_class(config)
    
    @classmethod
    def register(cls, name: str, repository_class: Type[JobRepository]):
        """Register a new repository implementation"""
        cls._repositories[name] = repository_class
    
    @classmethod
    def get_available_types(cls) -> list[str]:
        """Get list of available repository types"""
        return list(cls._repositories.keys())

# Convenience functions for common configurations
def create_sqlite_repository(db_path: str = 'jobs.db') -> JobRepository:
    """Create SQLite repository with specified path"""
    return RepositoryFactory.create('sqlite', path=db_path)

def create_postgresql_repository(database: str, host: str = 'localhost', 
                                user: str = None, password: str = None, 
                                port: int = 5432) -> JobRepository:
    """Create PostgreSQL repository"""
    return RepositoryFactory.create('peewee', database_config={
        'type': 'postgresql',
        'database': database,
        'host': host,
        'port': port,
        'user': user,
        'password': password
    })

def create_mysql_repository(database: str, host: str = 'localhost',
                           user: str = None, password: str = None,
                           port: int = 3306) -> JobRepository:
    """Create MySQL repository"""
    return RepositoryFactory.create('peewee', database_config={
        'type': 'mysql',
        'database': database,
        'host': host,
        'port': port,
        'user': user,
        'password': password
    })