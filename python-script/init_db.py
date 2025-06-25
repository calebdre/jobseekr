#!/usr/bin/env python3
"""
Database initialization script for jobseekr
Creates SQLite database and tables using Peewee models
"""

from repositories.factory import RepositoryFactory
from repositories.models import MODELS, database_proxy
from config import config
import os

def init_database():
    """Initialize the database and create all tables"""
    
    print("🔧 Initializing jobseekr database...")
    
    # Get database configuration
    db_config = config.get_database_config()
    print(f"Database type: {db_config.get('type', 'sqlite')}")
    print(f"Database path: {db_config.get('path', 'jobs.db')}")
    
    try:
        # Create repository instance (this will initialize the database)
        repo = RepositoryFactory.create('peewee', database_config=db_config)
        
        # The repository initialization already creates tables via _create_tables()
        # But let's verify they exist
        
        # Test the database by checking if tables were created
        from repositories.models import ProcessedJobModel
        
        # Try to count records (this will fail if table doesn't exist)
        count = ProcessedJobModel.select().count()
        print(f"✅ Database initialized successfully!")
        print(f"📊 Current processed jobs count: {count}")
        
        # Show table info
        print("\n📋 Database Schema:")
        print("Table: processed_jobs")
        print("  - job_url (TEXT, UNIQUE)")
        print("  - job_title (TEXT)")
        print("  - company (TEXT)")
        print("  - location (TEXT)")
        print("  - recommendation (TEXT: apply/maybe/skip)")
        print("  - confidence (INTEGER: 1-5)")
        print("  - fit_score (INTEGER: 1-5)")
        print("  - analysis_json (TEXT)")
        print("  - processed_at (TIMESTAMP)")
        print("  - content_hash (TEXT)")
        print("  - processing_version (TEXT)")
        
        repo.close()
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return False
    
    return True

def reset_database():
    """Reset the database by dropping and recreating all tables"""
    
    print("⚠️  RESETTING DATABASE - This will delete all data!")
    response = input("Are you sure? Type 'yes' to continue: ")
    
    if response.lower() != 'yes':
        print("❌ Database reset cancelled.")
        return False
    
    db_config = config.get_database_config()
    db_path = db_config.get('path', 'jobs.db')
    
    try:
        # Remove the database file if it exists
        if os.path.exists(db_path):
            os.remove(db_path)
            print(f"🗑️  Removed existing database: {db_path}")
        
        # Reinitialize
        return init_database()
        
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        return False

def show_database_info():
    """Show information about the current database"""
    
    try:
        repo = RepositoryFactory.create('peewee', database_config=config.get_database_config())
        
        stats = repo.get_processing_stats()
        
        print("\n📊 Database Statistics:")
        print(f"Total processed jobs: {stats['total']}")
        print(f"Apply recommendations: {stats['apply_count']}")
        print(f"Maybe recommendations: {stats['maybe_count']}")
        print(f"Skip recommendations: {stats['skip_count']}")
        print(f"Average fit score: {stats['avg_fit_score']}")
        print(f"Average confidence: {stats['avg_confidence']}")
        
        if stats['total'] > 0:
            print(f"\n📝 Recent jobs:")
            jobs = repo.get_processed_jobs(limit=5)
            for job in jobs:
                print(f"  • {job.job_title} at {job.company or 'Unknown'} - {job.recommendation}")
        
        repo.close()
        
    except Exception as e:
        print(f"❌ Error accessing database: {e}")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'reset':
            reset_database()
        elif command == 'info':
            show_database_info()
        elif command == 'init':
            init_database()
        else:
            print("Available commands:")
            print("  init  - Initialize database and create tables")
            print("  reset - Reset database (deletes all data)")
            print("  info  - Show database statistics")
    else:
        # Default: initialize database
        init_database()