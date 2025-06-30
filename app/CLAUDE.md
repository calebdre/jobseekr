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
- Enhanced analysis: `jobSummary`, `fitSummary`, `companySummary`, `whyGoodFit[]`, `potentialConcerns[]`, `keyTechnologies[]`
- Job status tracking: `status` (unread/applied/not_interested/saved_for_later), `statusUpdatedAt`
- Metadata: `contentHash`, `createdAt`, `userId`

#### SearchSession
- Session management: `id`, `userId`, `status` (pending/in_progress/completed/failed)
- Progress tracking: `progress` (JSON with current/total/message)
- Pagination support: `currentPage`, `totalResults`, `processedCount`, `batchSize`
- Metadata: `jobTitle`, `createdAt`, `updatedAt`, `completedAt`

### Key Files

#### API Routes
- `src/app/api/search/stream/route.ts`: Main job search with real-time streaming
- `src/app/api/search/status/route.ts`: SearchSession management (GET/DELETE)
- `src/app/api/jobs/route.ts`: Fetch processed jobs for user

#### Frontend Components
- `src/app/page.tsx`: Main application with search form, batch controls, and results display
- `src/components/JobCard.tsx`: Collapsible job cards with company summary and detailed analysis
- `src/hooks/useSearchSession.ts`: Real-time Supabase subscription management
- `src/hooks/useJobSearch.ts`: Search state management with batch processing support

#### Services & Libraries
- `src/lib/services/ai.ts`: Enhanced AI analysis with stronger judgment criteria
- `src/lib/services/search.ts`: Google Custom Search integration with parallel API calls and pagination
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
  company_summary: "Company background and culture insights",
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
- **Smart job search**: Google Custom Search with content validation and parallel API calls
- **Batch processing**: User-controlled processing of 30 jobs at a time with continuation options
- **AI-powered analysis**: Enhanced prompt with stronger judgment criteria and company insights
- **Duplicate detection**: Skip already processed jobs for efficiency
- **Real-time progress**: Live updates via Supabase subscriptions
- **State persistence**: SearchSession management with pagination support for navigation resilience

### User Experience
- **Batch controls**: Continue/stop processing with clear progress indicators and remaining counts
- **Collapsible job cards**: Compact view with company summary, expandable for detailed analysis
- **Session management**: Auto-expiration after 48 hours with fresh search options
- **Result notifications**: Alerts when job counts change between sessions
- **Reconnection support**: Resume search progress after navigation
- **Concurrent prevention**: Block multiple searches per user
- **Rich job display**: Structured analysis with pros/cons, technologies, and raw analysis
- **Job status tracking**: Mark jobs as applied, saved, or not interested with filtering
- **Search cancellation**: Cancel in-progress searches
- **Form persistence**: Resume/preferences saved in localStorage

### Production Features
- **Error handling**: Comprehensive error recovery and user feedback
- **Search expiration**: Auto-cleanup with session persistence up to 48 hours
- **Progress tracking**: Detailed progress with meaningful status messages and batch completion
- **Pagination support**: Handle large result sets (1000+ jobs) with manageable batches
- **Parallel processing**: Faster Google API calls with Promise.all implementation
- **Responsive design**: Mobile-friendly interface

## User Flow

### New Search
1. User enters job title, uploads/pastes resume, sets preferences
2. Form validation and concurrent search prevention
3. SearchSession created with pagination fields, real-time subscription established
4. First batch (30 jobs) fetched from Google Custom Search API with parallel calls
5. Content extracted and validated via Jina AI for each job
6. Each valid job analyzed by AI with enhanced prompt including company analysis
7. Results stored in database and streamed to UI with collapsible cards
8. Batch completion shown with continue/stop options

### Batch Continuation Flow
1. User clicks "Continue" to process next 30 jobs
2. SearchSession updated with new pagination state
3. Next batch fetched starting from current position
4. Processing continues with real-time updates
5. Repeat until all jobs processed or user stops

### Session Management
1. Sessions auto-expire after 48 hours
2. Result count changes detected and shown to user
3. Fresh searches reset pagination and start from beginning
4. Duplicate job detection across all batches

### Reconnection Flow
1. User navigates away during active search
2. On return/refresh, app checks for active SearchSession
3. If found, shows reconnection message and establishes real-time subscription
4. User sees live progress updates from current state
5. Batch or search completes normally with full result display

### Historical Data
- Previous job results loaded automatically on page refresh
- Collapsible job cards with company summary visible by default
- Rich expandable display with enhanced analysis fields
- Technology tags and structured pros/cons lists
- Job status filtering and management

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
- ✅ **Batch job processing**: User-controlled processing of 30 jobs at a time with continuation options
- ✅ **Pagination system**: Handle large result sets (1000+ jobs) with SearchSession state management
- ✅ **Session expiration**: 48-hour auto-expiration with fresh search options and result change detection
- ✅ **Parallel API optimization**: Google Search API calls now run in parallel using Promise.all
- ✅ **Collapsible job cards**: Compact default view with company summary, expandable for detailed analysis
- ✅ **Company analysis**: Added company_summary field to AI analysis and UI display

## Future Roadmap

- **Advanced filtering**: Filter by technology, salary range, recommendation
- **Email alerts**: Periodic job search notifications
- **Enhanced UI**: Aceternity components and skeleton loading
- **Bulk job actions**: Select multiple jobs for batch status updates
- **Search analytics**: Track application success rates and job market trends
- **Export functionality**: Export job lists to CSV or PDF formats
- **Custom batch sizes**: Allow users to configure batch processing size (10, 30, 50, 100)
- **Smart notifications**: Notify when high-quality jobs are found based on user preferences