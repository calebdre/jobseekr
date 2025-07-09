# JobSeekr - AI-Powered Job Search Assistant

JobSeekr is a web application that helps job seekers find relevant opportunities from HackerNews "Who's Hiring" threads by analyzing job postings against their resume and preferences using AI.

## Features

- 🔍 **HackerNews Job Analysis**: Automatically processes "Who's Hiring" threads
- 🤖 **AI-Powered Job Matching**: Uses AI to analyze job fit based on your resume and preferences
- 📊 **Bulk Analysis**: Process multiple job postings at once
- 💼 **Job Data Extraction**: Automatically extracts job details (title, company, location, salary, etc.)
- 🎯 **Personalized Recommendations**: Get job fit scores and detailed analysis
- 📱 **Modern UI**: Built with Mantine components and Tailwind CSS
- ⚡ **Real-time Updates**: Live progress tracking during job processing

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Convex (real-time database and serverless functions)
- **UI Components**: Mantine, Tailwind CSS
- **AI/LLM**: Together AI
- **Testing**: Vitest
- **Additional**: Prisma, Supabase integration

## Prerequisites

- Node.js 18+ and npm
- A Convex account ([convex.dev](https://convex.dev))
- Together AI API key ([together.ai](https://together.ai))

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd jobseekr/app
npm install
```

### 2. Set Up Convex

1. Install Convex CLI globally:
```bash
npm install -g convex
```

2. Initialize Convex in your project:
```bash
npx convex dev
```

3. Follow the prompts to create a Convex account and project

### 3. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Convex
CONVEX_DEPLOYMENT=<your-convex-deployment-url>
NEXT_PUBLIC_CONVEX_URL=<your-convex-deployment-url>

# Together AI
TOGETHER_API_KEY=<your-together-ai-api-key>

# Optional: Supabase (if using Supabase features)
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### 4. Database Setup

The app uses Convex as the primary database. The schema includes:

- `hackernews_threads`: Thread metadata and processing status
- `hackernews_comments`: Individual job postings and extracted data
- `hackernews_analyses`: User-specific job fit analysis results
- `bulk_analysis_sessions`: Bulk processing session management

To seed the database with sample data:

```bash
npm run db:seed
```

To reset the database:

```bash
npm run db:reset
```

### 5. Start Development

Start both the Next.js development server and Convex:

```bash
# Terminal 1: Start Convex
npm run convex:dev

# Terminal 2: Start Next.js (in a new terminal)
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Available Scripts

### Development
- `npm run dev` - Start Next.js development server with Turbopack
- `npm run convex:dev` - Start Convex development environment

### Database
- `npm run db:reset` - Clear all data from Convex database
- `npm run db:seed` - Import sample data
- `npm run db:reset-seed` - Reset and seed database

### Testing
- `npm run test` - Run tests in watch mode
- `npm run test:once` - Run tests once
- `npm run test:coverage` - Run tests with coverage report

### Build & Deploy
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run convex:deploy` - Deploy Convex functions

## How to Use

1. **Access the Application**: Navigate to `http://localhost:3000`

2. **Upload Your Resume**: Upload your resume PDF for AI analysis

3. **Set Job Preferences**: Enter your job preferences and requirements

4. **Add HackerNews Thread**: Enter a HackerNews "Who's Hiring" thread URL

5. **Process Jobs**: The app will automatically:
   - Fetch all comments from the thread
   - Extract job posting data using AI
   - Analyze job fit against your profile
   - Display results with recommendations

6. **Review Results**: View job postings with:
   - Extracted job details (title, company, location, salary, etc.)
   - AI-powered fit scores and analysis
   - Personalized recommendations (apply/maybe/skip)

## Key Components

### HackerNewsComment
Unified component that handles both processed and unprocessed job comments with:
- Job data display for processed comments
- Status indicators for unprocessed comments
- Collapsible original comment text
- Job fit analysis integration

### Bulk Analysis
Process multiple job postings efficiently:
- Queue management for large thread processing
- Progress tracking with real-time updates
- Pause/resume functionality
- Error handling and retry logic

### AI Integration
- **Job Data Extraction**: Automatically parse job details from comments
- **Job Fit Analysis**: Compare jobs against user profile
- **Content Validation**: Ensure job postings are legitimate
- **Personalized Scoring**: Generate fit scores and recommendations

## Development Notes

- The app uses Convex for real-time data synchronization
- AI processing is handled through Together AI's API (for free LLM calls using DeepSeek-R1/Llama 3.3 70B)
- Job data is extracted and validated using structured AI prompts
- The UI is built with Mantine components 
- TypeScript is used throughout for type safety
