# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a Python project with no formal dependency management. Install dependencies manually as needed:

```bash
# Install required packages
pip install requests ollama anthropic tqdm

# Run the main job search script
python search.py

# Load and process jobs from saved results
python -c "from search import load_jobs_from_file, process_job; jobs = load_jobs_from_file('job_results.json'); process_job(jobs[0])"
```

## Architecture Overview

This is a job search automation tool that:

1. **Searches for jobs** using Google Custom Search API
2. **Fetches job content** via Jina AI reader API
3. **Analyzes job fit** using AI models (Anthropic Claude or local Ollama)

### Core Components

- `search.py` - Main orchestration script containing:
  - `search_jobs()` - Queries Google Custom Search for job listings
  - `fetch_content()` - Retrieves full job posting content via Jina AI
  - `process_job()` - Analyzes job fit using AI models
  - `isIndividualJobPosting()` - Filters out job listing pages vs individual postings

- `job_types.py` - Data structures and persistence:
  - `Job` dataclass - Core job listing model
  - JSON serialization/deserialization utilities
  - File I/O functions for job data

- `data.py` - Configuration data:
  - `RESUME` - Complete resume text for job matching
  - `PREFERENCES` - Job search criteria and preferences

### AI Integration

The system supports two AI backends:
- **Anthropic Claude** (commented out in current version)
- **Local Ollama** (currently active) using mistral-small:24b model

Job analysis returns structured JSON with:
- Recommendation (apply/maybe/skip)
- Confidence and fit scores (1-5)
- Job summary and fit analysis
- Specific strengths and concerns

### Data Flow

1. Search → Parse → Filter → Analyze → Save
2. Results stored in `job_results.json` and `processed_jobs.json`
3. Content fetching uses Jina AI reader for clean text extraction

## Key Configuration

- Google Custom Search API credentials are embedded in `search.py:33-34`
- Anthropic API key is present but commented out
- Default search filters to last 3 days (`d3`)
- Job analysis uses structured prompts for consistent evaluation

## Development Notes

- No formal testing framework - test manually with sample data
- No linting configuration - follow Python PEP 8 conventions
- Hardcoded API keys should be moved to environment variables for production use