# Jobseekr Web Application

## Overview

A production-ready Next.js web application that intelligently searches for jobs, analyzes them with AI, and provides personalized recommendations. Features real-time search progress tracking, enhanced AI analysis, and robust state management.

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Database**: Supabase PostgreSQL with Prisma ORM
- **Real-time**: Supabase real-time subscriptions
- **AI**: Together AI (Llama 3.3 70B) for job analysis
- **PDF Processing**: PDF.js for resume uploads
- **Job Search**: Google Custom Search API
- **Content Extraction**: Jina AI reader API

## Architecture

### Database Schema (Prisma)

#### User
- `id` (String): Unique user identifier
- `createdAt` (DateTime): Account creation timestamp
- `jobs[]`: Relationship to ProcessedJob records
- `searchSessions[]`: Relationship to SearchSession records

#### ProcessedJob
- Core job data: `title`, `company`, `location`, `salary`, `url`, `content`
- AI analysis: `recommendation` (apply/maybe/skip), `fitScore` (1-5), `confidence` (1-5)
- Enhanced analysis: `jobSummary`, `fitSummary`, `whyGoodFit[]`, `potentialConcerns[]`, `keyTechnologies[]`
- Metadata: `contentHash`, `createdAt`, `userId`

#### SearchSession
- Session management: `id`, `userId`, `status` (pending/in_progress/completed/failed)
- Progress tracking: `progress` (JSON with current/total/message)
- Metadata: `jobTitle`, `createdAt`, `updatedAt`, `completedAt`

### Key Files

#### API Routes
- `src/app/api/search/stream/route.ts`: Main job search with real-time streaming
- `src/app/api/search/status/route.ts`: SearchSession management (GET/DELETE)
- `src/app/api/jobs/route.ts`: Fetch processed jobs for user

#### Frontend Components
- `src/app/page.tsx`: Main application with search form and results display
- `src/hooks/useSearchSession.ts`: Real-time Supabase subscription management

#### Services & Libraries
- `src/lib/services/ai.ts`: Enhanced AI analysis with stronger judgment criteria
- `src/lib/services/search.ts`: Google Custom Search integration
- `src/lib/services/content.ts`: Jina AI content extraction
- `src/lib/services/content-validator.ts`: Job posting validation
- `src/lib/supabase.ts`: Supabase client configuration
- `src/lib/db.ts`: Prisma client setup

#### Utilities
- `src/lib/utils/parsers.ts`: Job data parsing and content hashing

### Enhanced AI Analysis

The AI system provides comprehensive job analysis with:

#### Stronger Judgment Criteria
- **Apply**: Strong alignment with preferences AND resume, minimal concerns
- **Maybe**: ONLY when insufficient information to make clear decision
- **Skip**: Clear mismatch with preferences OR significant red flags

#### Rich Response Structure
```typescript
{
  recommendation: 'apply' | 'maybe' | 'skip',
  confidence: 1-5,
  fitScore: 1-5,
  job_summary: "Role overview and daily responsibilities",
  fit_summary: "Why this is/isn't a good fit",
  why_good_fit: ["Specific alignment reasons"],
  potential_concerns: ["Specific concerns or gaps"],
  summary: {
    role: "exact job title",
    company: "company name",
    location: "location/remote status",
    salary_range: "salary or 'Not specified'",
    key_technologies: ["tech1", "tech2"]
  }
}
```

## Features

### Core Functionality
- **Smart job search**: Google Custom Search with content validation
- **AI-powered analysis**: Enhanced prompt with stronger judgment criteria
- **Duplicate detection**: Skip already processed jobs for efficiency
- **Real-time progress**: Live updates via Supabase subscriptions
- **State persistence**: SearchSession management for navigation resilience

### User Experience
- **Reconnection support**: Resume search progress after navigation
- **Concurrent prevention**: Block multiple searches per user
- **Rich job display**: Structured analysis with pros/cons, technologies
- **Search cancellation**: Cancel in-progress searches
- **Form persistence**: Resume/preferences saved in localStorage

### Production Features
- **Error handling**: Comprehensive error recovery and user feedback
- **Search expiration**: Auto-cleanup after 2 hours
- **Progress tracking**: Detailed progress with meaningful status messages
- **Responsive design**: Mobile-friendly interface

## User Flow

### New Search
1. User enters job title, uploads/pastes resume, sets preferences
2. Form validation and concurrent search prevention
3. SearchSession created, real-time subscription established
4. Jobs fetched from Google Custom Search API
5. Content extracted and validated via Jina AI
6. Each job analyzed by AI with enhanced prompt
7. Results stored in database and streamed to UI
8. SearchSession marked complete, subscription ends

### Reconnection Flow
1. User navigates away during active search
2. On return/refresh, app checks for active SearchSession
3. If found, shows reconnection message and establishes real-time subscription
4. User sees live progress updates from current state
5. Search completes normally with full result display

### Historical Data
- Previous job results loaded automatically on page refresh
- Rich display with enhanced analysis fields
- Technology tags and structured pros/cons lists

## Development Commands

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npx prisma generate  # Regenerate Prisma client
npx prisma migrate dev  # Create and apply migration
npx prisma studio    # Open database browser
```

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# APIs
TOGETHERAI_API_KEY="your_together_ai_key"
GOOGLE_SEARCH_API_KEY="your_google_api_key"
GOOGLE_SEARCH_ENGINE_ID="your_search_engine_id"
```

## Deployment

The application is designed for deployment on Railway with Supabase PostgreSQL:

1. **Database**: Supabase PostgreSQL with real-time subscriptions enabled
2. **Compute**: Railway for Next.js application hosting
3. **Environment**: Configure all environment variables in Railway
4. **Migration**: Run `npx prisma migrate deploy` in production

## Development Guidelines

### Git Commit Policy
**IMPORTANT**: Always ask the user for approval before making git commits after completing a feature or significant change. Present a summary of what was implemented and ask "Should I create a git commit for these changes?" before proceeding.

### Code Conventions
- Follow existing patterns and naming conventions
- Use TypeScript with strict typing
- Follow Tailwind CSS utility-first approach
- Implement proper error handling with user-friendly messages
- Add loading states for better UX

## Recent Enhancements

- ✅ Enhanced AI analysis with stronger judgment and richer responses
- ✅ Migrated from SQLite to Supabase PostgreSQL for production scalability
- ✅ Implemented SearchSession management for search state persistence
- ✅ Added real-time progress updates via Supabase subscriptions
- ✅ Created reconnection functionality for users navigating away
- ✅ Enhanced UI with structured job analysis display
- ✅ Added duplicate job detection and concurrent search prevention
- ✅ Implemented comprehensive error handling and user feedback
- ✅ Added job actions system (applied, saved, not interested) with filtering

## Future Roadmap

- **Advanced filtering**: Filter by technology, salary range, recommendation
- **Email alerts**: Periodic job search notifications
- **Enhanced UI**: Aceternity components and skeleton loading
- **Date-based search**: Fetch jobs from specific time periods
- **Retry mechanisms**: Automatic retry for failed searches