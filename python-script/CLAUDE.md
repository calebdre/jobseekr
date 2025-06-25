# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a Python project with database-backed persistence. Install dependencies manually as needed:

```bash
# Install required packages
pip install requests ollama anthropic tqdm peewee

# Run the refactored job search workflow
python search_refactored.py

# Run the original implementation (legacy)
python search.py

# Interactive job processing
python -c "from core.job_workflow import JobWorkflowOrchestrator; orchestrator = JobWorkflowOrchestrator(); orchestrator.run_workflow()"

# Generate HTML report from database results
python generate_web_report.py
```

## Architecture Overview

This is a modular job search automation tool built with clean architecture principles:

1. **Searches for jobs** using Google Custom Search API
2. **Fetches job content** via Jina AI reader API  
3. **Analyzes job fit** using configurable AI models (Anthropic Claude or local Ollama)
4. **Persists data** using database abstraction layer with multiple backend support

### Core Architecture

The system follows a layered architecture with clear separation of concerns:

#### **Main Entry Points**
- `search_refactored.py` - Primary entry point using refactored modular architecture
- `search.py` - Original monolithic implementation (legacy)

#### **Core Orchestration (`/core/`)**
- `job_workflow.py` - Main workflow orchestrator that coordinates the entire pipeline
  - Manages search → parse → filter → analyze → save workflow
  - Handles error recovery and processing statistics
  - Provides reprocessing capabilities for individual jobs

#### **Services Layer (`/services/`)**
- `search_service.py` - Google Custom Search API integration with rate limiting
- `content_service.py` - Jina AI content fetching with retry logic and exponential backoff
- `ai_service.py` - AI analysis abstraction layer using factory and strategy patterns
  - Supports multiple AI backends: Ollama (active) and Anthropic Claude
  - Handles job posting classification and job fit analysis

#### **Parsers (`/parsers/`)**
- `job_parser.py` - Converts search results into structured Job objects
  - Uses specialized text extractors for company, location, salary, and time parsing
- `content_analyzer.py` - AI-powered content analysis and job fit evaluation
  - Determines individual job postings vs. job listing pages
  - Generates content hashes for change detection

#### **Repository Layer (`/repositories/`)**
- `base.py` - Abstract repository interface for data operations
- `factory.py` - Factory pattern for creating repository instances
- `models.py` - Peewee ORM models for database schema
- `peewee_repository.py` - Implementation supporting SQLite/PostgreSQL/MySQL

#### **Utilities (`/utils/`)**
- `error_handling.py` - Custom exception hierarchy for different error types
- `hash_utils.py` - Content hashing for change detection and job ID generation
- `text_extractors.py` - Regex-based extractors for parsing job metadata

#### **Configuration (`config.py`)**
- Centralized configuration management supporting JSON files and environment variables
- Multi-database backend configuration (SQLite, PostgreSQL, MySQL)
- Flexible AI service configuration

### AI Integration

The system uses a flexible AI backend architecture:
- **Current Active**: Local Ollama using `qwen2.5:14b-instruct-q4_K_M` model
- **Available**: Anthropic Claude (configurable)
- **Factory Pattern**: Easy switching between AI providers
- **Dual Analysis**: Job posting classification + job fit evaluation

Job analysis returns structured JSON with:
- Recommendation (apply/maybe/skip)
- Confidence and fit scores (1-5)
- Job summary and fit analysis
- Specific strengths and concerns
- Content hashes for change tracking

### Data Flow & Architecture Patterns

```
Search API → Job Parser → Content Analyzer (AI) → Repository → Database
     ↓            ↓              ↓               ↓          ↓
 Raw Results → Job Objects → Content + Analysis → Domain Model → Persistence
```

**Key Patterns Used:**
- **Dependency Injection** - Services injected into workflow orchestrator
- **Factory Pattern** - AI services and repository creation
- **Strategy Pattern** - Multiple AI backends and database implementations
- **Repository Pattern** - Abstract data access layer
- **Domain-Driven Design** - Clear domain models (`Job`, `ProcessedJob`)

### Database & Persistence

- **ORM**: Peewee with support for SQLite, PostgreSQL, MySQL
- **Domain Model**: `ProcessedJob` dataclass with job data and AI analysis
- **Change Detection**: Content hashing to track job posting updates
- **Migration Support**: Database schema versioning

## Key Configuration

- **Environment-based**: API keys loaded from environment variables
- **JSON Config**: Centralized configuration in `config.py`
- **Database**: Configurable backend (default: SQLite at `jobs.db`)
- **AI Backend**: Configurable provider (default: Ollama)
- **Search Filters**: Default to last 3 days (`d3`)

## Development Notes

- **Architecture**: Clean, modular design with dependency injection
- **Error Handling**: Comprehensive exception hierarchy with proper recovery
- **Testing**: Manual testing with sample data (no formal framework)
- **Configuration**: Externalized via JSON + environment variables
- **Database**: Full ORM abstraction supporting multiple backends
- **AI Flexibility**: Easy switching between local and cloud AI providers