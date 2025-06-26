# Jobseekr Project

## Project Structure

This repository contains both the original Python implementation and the new Next.js web application:

- `/python-script/` - Original Python-based job search automation
- `/app/` - Next.js web application with enhanced features

## Python Script (Legacy)

Original implementation using Python for job search automation with local AI models and database persistence. See `/python-script/CLAUDE.md` for details.

## Next.js Web Application (Current)

Production-ready web application with enhanced UI, real-time features, and cloud infrastructure. See `/app/CLAUDE.md` for detailed documentation.

## Quick Start

### Web Application (Recommended)
```bash
cd app
npm install
npm run dev
```

### Python Script (Legacy)
```bash
cd python-script
pip install requests ollama anthropic tqdm peewee
python search.py
```

## Recent Development

The project has evolved from a Python script to a full-featured web application with:
- Enhanced AI analysis with stronger judgment criteria
- Real-time search progress tracking with Supabase
- Comprehensive SearchSession management
- Production-ready deployment infrastructure
- Rich UI with structured job analysis display