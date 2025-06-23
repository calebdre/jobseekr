'''
example url:
https://www.googleapis.com/customsearch/v1?key=AIzaSyBZ8z92vQwxxsXEwKl2p3T_4Px-TaCqSkM&cx=04e65784d460647ab&q=software+engineer&dateRestrict=d3
'''
import requests
from ollama import chat
import urllib.parse
import re
from typing import List

from job_types import Job, load_jobs_from_file
from data import RESUME, PREFERENCES
import anthropic
import json
import tqdm

client = anthropic.Anthropic(
    api_key="sk-mVacC_he9D8neSd1Lf1Ph2I-9wkhOrFkechKDC0yiL9JFyN5ak2jC1czsTVdDq3ZM4CRNNjHzYIq0pzC-pp19g",
)

def search_jobs(search_term: str, date_restrict: str = 'd3') -> List[Job]:
    """
    Searches for jobs using the Google Custom Search API and returns a simplified version of the results.
    
    Args:
        search_term (str): The search term to query for
        date_restrict (str, optional): Date restriction for results. Defaults to 'd3' (last 3 days).
    
    Returns:
        List[Job]: A list of Job objects
    """
    # API details from the example URL
    api_key = 'AIzaSyBZ8z92vQwxxsXEwKl2p3T_4Px-TaCqSkM'
    cx = '04e65784d460647ab'
    
    # Construct the URL
    base_url = 'https://www.googleapis.com/customsearch/v1'
    params = {
        'key': api_key,
        'cx': cx,
        'q': search_term,
        'sort': 'date'
    }
    
    query_string = '&'.join([f'{k}={urllib.parse.quote(str(v))}' for k, v in params.items()])
    url = f'{base_url}?{query_string}'
    
    # Make the request
    response = requests.get(url)
    
    # Check if the request was successful
    if response.status_code != 200:
        return []
    
    # Parse the response
    data = response.json()
    
    # Transform to simplified structure
    jobs = []
    
    # Process each job listing
    for item in data.get('items', []):
        # Extract time posted (e.g., "2 days ago", "10 hours ago")
        posted_time = re.search(r'(\d+\s+(?:day|hour|minute|second)s?\s+ago)', 
                               item.get('snippet', ''))
        posted_time = posted_time.group(1) if posted_time else 'Unknown'
        
        # Attempt to extract company name from the title
        title = item.get('title', '')
        company = None
        if ' - ' in title:
            parts = title.split(' - ')
            company = parts[-1]
            if '@' in title:
                company = title.split('@')[-1].strip()
            elif 'at' in title:
                company = title.split('at')[-1].strip()
        
        # Extract location from title or snippet
        location = None
        if ' - ' in title:
            location_match = re.search(r' - ([^-]+)$', title)
            location = location_match.group(1) if location_match else None
        
        # Get logo URL if available
        logo_url = None
        pagemap = item.get('pagemap', {})
        if 'cse_image' in pagemap and len(pagemap['cse_image']) > 0:
            logo_url = pagemap['cse_image'][0].get('src')
        
        # Requirements field removed as it was too limited in accuracy
        
        # Create job object
        job = Job(
            id=item.get('link', '').split('/')[-1],
            title=title,
            company=company,
            location=location,
            url=item.get('link'),
            posted_time=posted_time,
            description=item.get('snippet'),
            employment_type='Full-time',  # Default assumption
            salary=None,  # Usually not included in search results
            logo_url=logo_url
        )
        
        jobs.append(job)
    
    return jobs


def fetch_content(url: str) -> str:
    url = f"https://r.jina.ai/{url}"
    req = requests.get(url)
    if req.status_code == 200:
        return req.text
    else:
        return None

def process_job(job: Job) -> Job:
    content = fetch_content(job.url)
    isJobPosting = isIndividualJobPosting(content)
    if not content or not isJobPosting:
        return None
    
    prompt = f"""You are a job application advisor helping evaluate whether a job posting is a good fit based on a resume and specific preferences.

**RESUME:**
{RESUME}

**JOB POSTING:**
{content}

**PREFERENCES:**
{PREFERENCES}

**TASK:**
Analyze this job posting against the resume and preferences. Provide a structured evaluation to help decide whether to apply.

**SCORING GUIDE:**
- Confidence (1-5): How certain are you about this recommendation?
- Fit Score (1-5): Overall match between candidate and role
  - 5: Excellent fit, strong match on most criteria
  - 4: Good fit, matches well with minor gaps
  - 3: Decent fit, some alignment but notable gaps
  - 2: Poor fit, significant mismatches
  - 1: Very poor fit, major misalignment

**RECOMMENDATIONS:**
- "apply": Strong fit, few concerns, aligns well with preferences
- "maybe": Decent fit but has concerns or gaps worth considering
- "skip": Poor fit, major red flags, or doesn't meet key preferences

Output your analysis in this exact JSON format:

{{
  "recommendation": "apply" | "maybe" | "skip",
  "confidence": 1-5,
  "fit_score": 1-5,
  "summary": {{
    "role": "exact role title",
    "company": "company name",
    "location": "location/remote status",
    "salary_range": "salary if mentioned, or 'Not specified'",
    "key_technologies": ["list", "of", "main", "technologies"]
  }},
  "job_summary": "2-4 sentence description of what this role involves, the main responsibilities, the company, and how the role impacts the company",
  "fit_summary": "2-3 sentence summary of why this would or wouldn't be a good fit based on the resume and preferences",
  "why_good_fit": [
    "specific reasons why this matches well"
  ],
  "potential_concerns": [
    "specific concerns or red flags about this role"
  ]
}}

Focus on practical fit assessment. Consider technical skills match, seniority level, company preferences, location/remote requirements, and any red flags in the job posting quality or requirements."""

    # message = client.beta.messages.create(
    #     model="claude-sonnet-4-20250514",
    #     max_tokens=20000,
    #     temperature=0.5,
    #     messages=[
    #         {"role": "user", "content": prompt}
    #     ]
    # )

    response = chat(
        model="mistral-small:24b",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    print(response.message)

    return response.message.content

def save_to_file(data, filename: str) -> None:
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)


'''
function isIndividualJobPosting(pageContent) {
  // Look for specific job posting indicators
  const jobPostingIndicators = [
    'job description',
    'responsibilities',
    'requirements',
    'what you\'ll be doing',
    'what you\'ll bring',
    'qualifications'
  ];
  
  // Look for job listing indicators
  const jobListingIndicators = [
    'open positions',
    'see all jobs',
    'current openings',
    'job opportunities',
    'available positions'
  ];
  
  const content = pageContent.toLowerCase();
  const postingScore = jobPostingIndicators.filter(indicator => 
    content.includes(indicator)).length;
  const listingScore = jobListingIndicators.filter(indicator => 
    content.includes(indicator)).length;
    
  return postingScore > listingScore;
}
'''
def isIndividualJobPosting(pageContent: str) -> bool:
    jobPostingIndicators = [
        'job description',
        'responsibilities',
        'requirements',
        'what you\'ll be doing',
        'what you\'ll bring',
        'qualifications'
    ]
    jobListingIndicators = [
        'open positions',
        'see all jobs',
        'current openings',
        'job opportunities',
        'available positions'
    ]
    content = pageContent.lower()
    postingScore = len([indicator for indicator in jobPostingIndicators if indicator in content])
    listingScore = len([indicator for indicator in jobListingIndicators if indicator in content])

    pageTitle = re.search(r'Title: (.*?)\n', pageContent)
    if pageTitle:
        pageType = analyzePageTitle(pageTitle.group(1))
        if pageType == 'job_listing':
            return False
    
    return postingScore > listingScore

def analyzePageTitle(title: str) -> str:
    if ' | ' in title or '-' in title or 'at' in title:
        return 'individual_posting'
    if 'careers' in title.lower() or 'jobs' in title.lower() or 'open positions' in title.lower():
        return 'job_listing'
    return 'unknown'


    

# Example usage
if __name__ == '__main__':
    # results = search_jobs('software engineer')
    # # Use the save_jobs_to_file function from types.py
    # save_jobs_to_file(results, 'job_results.json')
    # print(f'Found {len(results)} results')
    # print(f'Saved {len(results)} job listings to job_results.json')
    
    jobs = load_jobs_from_file('job_results.json')
    
    # Configure trafilatura with custom settings
    # config = trafilatura.settings.use_config()
    # config.set("DEFAULT", "USER_AGENTS", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

    # # Fetch with custom config
    # content = trafilatura.fetch_url('https://boards.greenhouse.io/toast/jobs/6940670', config=config)

    process_job(jobs[0])
    # processed_jobs = []
    # for job in jobs:
    #     processed = process_job(job)
    #     if processed:
    #         processed_jobs.append(processed)
    #     else:
    #         print(f'Failed to process {job.url}')
    # print(processed_jobs)
    # save_to_file(processed_jobs, 'processed_jobs.json')
