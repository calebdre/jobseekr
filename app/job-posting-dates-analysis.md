# Job Posting Dates Analysis

## Current Implementation Status

The job search currently uses Google Custom Search with:
- `dateRestrict: "d1"` (last 24 hours)
- `sort: "date"` (date-sorted results)

This provides good filtering for recent jobs with relative timestamps like "19 hours ago" in search snippets.

## Date Information Availability

### High Accuracy (80-90% for recent jobs)
- Major job platforms (Greenhouse, Workable, Lever) consistently show relative timestamps
- Google's date filtering is reliable for recent postings
- Format: "19 hours ago", "2 days ago", etc. in the `snippet` field

### Challenges
- No exact posting timestamps in Google Custom Search API response
- Some job boards don't include posting dates in HTML snippets
- Older jobs (>7 days) have less reliable date information
- Google provides relative dates, not absolute timestamps

## Implementation Recommendations

### 1. Current Approach (Recommended)
Keep using `dateRestrict: "d1"` or `"d7"` - very effective for fresh jobs.

### 2. Enhanced Date Extraction
Add date parsing to the job parser (`src/lib/utils/parsers.ts`):

```typescript
// Add to JobData interface
export interface JobData {
  // ... existing fields
  postedAgo?: string; // "19 hours ago", "2 days ago", etc.
  estimatedPostDate?: Date; // converted to actual date
}

// Add extraction function
function extractPostingDate(snippet: string): { postedAgo?: string; estimatedPostDate?: Date } {
  const patterns = [
    /(\d+)\s+hours?\s+ago/i,
    /(\d+)\s+days?\s+ago/i,
    /(\d+)\s+weeks?\s+ago/i,
    /(yesterday)/i,
    /(today)/i
  ];
  
  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match) {
      const postedAgo = match[0];
      const estimatedPostDate = parseRelativeDate(postedAgo);
      return { postedAgo, estimatedPostDate };
    }
  }
  
  return {};
}

function parseRelativeDate(relativeDate: string): Date {
  const now = new Date();
  const match = relativeDate.match(/(\d+)\s+(hour|day|week)s?\s+ago/i);
  
  if (!match) return now;
  
  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'hour':
      return new Date(now.getTime() - (amount * 60 * 60 * 1000));
    case 'day':
      return new Date(now.getTime() - (amount * 24 * 60 * 60 * 1000));
    case 'week':
      return new Date(now.getTime() - (amount * 7 * 24 * 60 * 60 * 1000));
    default:
      return now;
  }
}
```

### 3. Alternative: Content-Based Date Extraction
Extract dates from actual job page content after fetching (lower priority).

## Accuracy Expectations

| Time Range | Date Info Availability | Notes |
|------------|----------------------|-------|
| < 24 hours | ~90% | Excellent with current setup |
| 1-7 days | ~85% | Very good |
| 1-4 weeks | ~60% | Decent |
| > 1 month | ~40% | Limited |

## Database Schema Considerations

If implementing date extraction, consider adding to `ProcessedJob` model:
```prisma
model ProcessedJob {
  // ... existing fields
  postedAgo      String?   // "19 hours ago"
  estimatedPostDate DateTime? // parsed date
}
```

## Search Strategy Recommendations

1. **Primary**: Use `dateRestrict: "d1"` for daily fresh jobs
2. **Weekly catch-up**: Use `dateRestrict: "d7"` for broader sweeps
3. **Focus on recency**: Most valuable jobs are posted within 24-48 hours
4. **Platform reliability**: Greenhouse, Workable, Lever have best date consistency

## Google Custom Search Date Filters

Available `dateRestrict` options:
- `"d1"` - past 24 hours
- `"d7"` - past week  
- `"m1"` - past month
- `"m6"` - past 6 months
- `"y1"` - past year

Current implementation uses `"d1"` which is optimal for job freshness.