'''
JobSeekr - AI-powered job search and analysis tool

Example URL:
https://www.googleapis.com/customsearch/v1?key=AIzaSyBZ8z92vQwxxsXEwKl2p3T_4Px-TaCqSkM&cx=04e65784d460647ab&q=software+engineer&dateRestrict=d3
'''
import requests
from ollama import chat
import urllib.parse
import re
import hashlib
from typing import List, Optional

from job_types import Job
from data import RESUME, PREFERENCES
from repositories.factory import RepositoryFactory
from repositories.base import ProcessedJob
from config import config
import anthropic
import json
import tqdm

client = anthropic.Anthropic(
    api_key="sk-mVacC_he9D8neSd1Lf1Ph2I-9wkhOrFkechKDC0yiL9JFyN5ak2jC1czsTVdDq3ZM4CRNNjHzYIq0pzC-pp19g",
)

def search_and_process_jobs(search_term: str) -> List[Job]:
    """
    Searches for jobs using the Google Custom Search API and returns a simplified version of the results.
    
    Args:
        search_term (str): The search term to query for
    
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
        title = item.get('title', '')
        snippet = item.get('snippet', '')
        link = item.get('link', '')
        display_link = item.get('displayLink', '')
        
        # Extract posted time from snippet (e.g., "2 days ago", "10 hours ago")
        posted_time_match = re.search(r'(\d+\s+(?:day|hour|minute|second)s?\s+ago)', snippet)
        posted_time = posted_time_match.group(1) if posted_time_match else 'Unknown'
        
        # Extract company name from multiple sources
        company = None
        
        # Method 1: Look for "@ Company" pattern in title
        company_match = re.search(r'@\s*([^\|\-]+?)(?:\s*$|\s*\||\s*\-)', title)
        if company_match:
            company = company_match.group(1).strip()
        
        # Method 2: Try to extract from display link (e.g., "boards.greenhouse.io" -> look for company in URL)
        if not company and 'greenhouse.io' in display_link:
            # For greenhouse URLs like "boards.greenhouse.io/toast/jobs/6940670"
            greenhouse_match = re.search(r'boards\.greenhouse\.io/([^/]+)/', link)
            if greenhouse_match:
                company = greenhouse_match.group(1).replace('-', ' ').title()
        
        # Method 3: Look for company names in metatags
        if not company:
            pagemap = item.get('pagemap', {})
            metatags = pagemap.get('metatags', [{}])
            if metatags:
                og_title = metatags[0].get('og:title', '')
                # Look for patterns like "Job Title - Company" or "Job Title | Company"
                company_patterns = [
                    r'\-\s*([^\-\|]+?)\s*$',  # "Job Title - Company"
                    r'\|\s*([^\-\|]+?)\s*$',  # "Job Title | Company"
                    r'at\s+([^\-\|]+?)(?:\s*$|\s*\||\s*\-)',  # "Job Title at Company"
                ]
                for pattern in company_patterns:
                    match = re.search(pattern, og_title)
                    if match:
                        company = match.group(1).strip()
                        break
        
        # Extract location from title and metadata
        location = None
        
        # Method 1: Look for location patterns in title
        location_patterns = [
            r'Remote\s*-\s*([^\-\|]+)',  # "Remote - USA"
            r'([^\-\|]+)\s*-\s*Remote',  # "USA - Remote" 
            r'\-\s*([^\-\|,]+(?:,\s*[^\-\|]+)*)\s*$',  # Location at end after dash
        ]
        
        for pattern in location_patterns:
            match = re.search(pattern, title)
            if match:
                potential_location = match.group(1).strip()
                # Filter out common non-location terms
                if not re.search(r'(engineer|developer|software|job|position)', potential_location.lower()):
                    location = potential_location
                    break
        
        # Method 2: Check snippet for location indicators
        if not location:
            snippet_location = re.search(r'Location[:\.]?\s*([^\n\r\.]+)', snippet)
            if snippet_location:
                location = snippet_location.group(1).strip()
        
        # Method 3: Look for "Remote" keyword
        if not location and re.search(r'\bremote\b', title.lower()):
            location = 'Remote'
        
        # Extract salary information from snippet
        salary = None
        salary_patterns = [
            r'\$([\d,]+)\s*[–\-]\s*\$([\d,]+)',  # "$150K – $200K"
            r'Compensation[:\.]?\s*\$([\d,]+)\s*[–\-]\s*\$([\d,]+)',  # "Compensation: $150K – $200K"
            r'([\d,]+)K\s*[–\-]\s*([\d,]+)K',  # "150K – 200K"
        ]
        
        for pattern in salary_patterns:
            match = re.search(pattern, snippet)
            if match:
                if len(match.groups()) == 2:
                    salary = f"${match.group(1)} - ${match.group(2)}"
                else:
                    salary = f"${match.group(1)}"
                break
        
        # Get logo URL from pagemap
        logo_url = None
        pagemap = item.get('pagemap', {})
        if 'cse_image' in pagemap and len(pagemap['cse_image']) > 0:
            logo_url = pagemap['cse_image'][0].get('src')
        
        # Generate better job ID using URL hash
        job_id = hashlib.md5(link.encode()).hexdigest()[:12] if link else str(len(jobs))
        
        # Create job object
        job = Job(
            id=job_id,
            title=title,
            company=company,
            location=location,
            url=link,
            postedTime=posted_time,
            description=snippet,
            employmentType='Full-time',  # Default assumption
            salary=salary,
            logoUrl=logo_url
        )
        
        jobs.append(job)
    
    # Process jobs immediately after fetching
    repo = get_repository()
    processed_jobs = []
    
    try:
        print(f"\nProcessing {len(jobs)} jobs...")
        
        for job in tqdm.tqdm(jobs, desc="Processing jobs"):
            # Skip if already processed
            if repo.is_job_processed(job.url):
                print(f"Already processed: {job.title}")
                continue
            
            # Fetch content and check if it's an individual job posting (combined step)
            print(f"Analyzing: {job.title}")
            content = isIndividualJobPosting(job.url)
            if not content:
                print(f"❌ Skipping {job.title}")
                continue
            
            # Generate content hash (content is now guaranteed to be a string)
            content_hash = hashlib.sha256(content.encode()).hexdigest()
            
            # Check if content has changed
            # if not repo.has_content_changed(job.url, content_hash):
            #     print(f"Content unchanged: {job.title}")
            #     continue
            
            # Process with AI using the fetched content
            try:
                print(f"✅ Processing job: {job.title}")
                analysis_text = process_job(content)
                if not analysis_text:
                    print(f"AI processing failed: {job.title}")
                    continue
                
                # Parse AI response
                analysis = json.loads(analysis_text)
                
                # Save to database
                processed_job = ProcessedJob.from_job_and_analysis(job, analysis, content_hash)
                repo.save_processed_job(processed_job)
                
                print(f"✓ {job.title} - {analysis['recommendation']} (fit: {analysis['fit_score']})")
                processed_jobs.append(job)
                
            except json.JSONDecodeError as e:
                print(f"Failed to parse AI response for {job.title}: {e}")
                continue
        
        print(f"\n✓ Successfully processed {len(processed_jobs)} new jobs")
        
        # Show quick stats
        stats = repo.get_processing_stats()
        print(f"Database totals - Apply: {stats['apply_count']}, Maybe: {stats['maybe_count']}, Skip: {stats['skip_count']}")
        
        return processed_jobs
        
    finally:
        repo.close()


def fetch_content(url: str) -> str:
    url = f"https://r.jina.ai/{url}"
    req = requests.get(url)
    if req.status_code == 200:
        return req.text
    else:
        return None

def process_job(content: str) -> Optional[str]:
    """Process a job with AI analysis using pre-fetched content"""
    
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
    print(f"AI response: {response.message.content}")

    return response.message.content.replace("```json", "").replace("```", "")


def isIndividualJobPosting(job_url: str):
    """
    Uses LLM to determine if a URL contains an individual job posting.
    Fetches the content and asks the LLM to analyze it.
    
    Returns:
        str: Page content if it's an individual job posting
        False: If it's a job listing page, no job info, or fetch failed
    """
    print(f"  Fetching and analyzing: {job_url}")
    
    # Fetch the content
    content = fetch_content(job_url)
    if not content:
        print(f"  ❌ Failed to fetch content for {job_url}")
        return False
    
    # Create a focused prompt for the LLM
    prompt = f"""Analyze this webpage content and categorize it into one of three types:

1. INDIVIDUAL JOB POSTING - Contains:
   - Details about ONE specific job role
   - Job description, responsibilities, requirements
   - Information about applying for THIS specific position
   - Company information for THIS role

2. JOB LISTING PAGE - Contains:
   - Multiple job openings
   - Links to various positions
   - General career information
   - "Browse jobs", "See all openings", "Filter positions" type content

3. NO JOB INFO - Contains:
   - No job-related information
   - Error pages, redirects, login pages
   - General company info without job details
   - Broken/empty/irrelevant content

WEBPAGE CONTENT:
{content[:3000]}...

Respond with EXACTLY ONE WORD:
- "INDIVIDUAL" if this is a single job posting
- "LISTING" if this is a jobs listing/careers page  
- "NONE" if there's no useful job information"""
    
    try:
        # Use Ollama to analyze
        response = chat(
            model="qwen2.5:14b-instruct-q4_K_M",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        llm_response = response.message.content.strip().upper()
        print(f"  🤖 LLM says: {llm_response}")
        
        if "INDIVIDUAL" in llm_response:
            print(f"  ✅ Confirmed as individual job posting")
            return content
        elif "LISTING" in llm_response:
            print(f"  ❌ Detected as job listing page")
            return False
        elif "NONE" in llm_response:
            print(f"  ❌ No job information found")
            return False
        else:
            print(f"  ❓ Unclear response, treating as non-individual")
            return False
            
    except Exception as e:
        print(f"  ❌ LLM analysis failed: {e}")
        return False

def get_repository():
    """Get repository instance from configuration"""
    db_config = config.get_database_config()
    return RepositoryFactory.create('peewee', database_config=db_config)


if __name__ == '__main__':
    print("🔍 Searching for Software Engineer (Remote) jobs...")
    processed_jobs = search_and_process_jobs('Software engineer (remote)')
    print(f'\n✅ Successfully processed {len(processed_jobs)} new jobs')
