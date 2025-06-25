#!/usr/bin/env python3
"""
Generate a static HTML report from job analysis results in the database.
"""

import webbrowser
from datetime import datetime
from typing import List, Dict, Any
import json
import os

from repositories.factory import RepositoryFactory
from repositories.base import ProcessedJob
from config import Config

def get_job_data() -> List[Dict[str, Any]]:
    """Fetch all processed jobs from the database"""
    config = Config()
    
    # Get database config from Config
    db_config = config.get_database_config()
    repo = RepositoryFactory.create('peewee', database_config=db_config)
    
    jobs = repo.get_processed_jobs()
    
    # Convert to dictionaries for JSON serialization
    job_data = []
    for job in jobs:
        job_dict = {
            'id': getattr(job, 'id', None),
            'title': job.job_title,
            'company': job.company,
            'location': job.location,
            'url': job.job_url,
            'date_posted': job.posted_time,
            'salary_range': job.salary,
            'content_hash': job.content_hash,
            'recommendation': job.recommendation,
            'confidence': job.confidence,
            'fit_score': job.fit_score,
            'analysis_summary': job.analysis_json,
            'created_at': job.processed_at.isoformat() if job.processed_at else None,
            'updated_at': None  # Not available in ProcessedJob model
        }
        job_data.append(job_dict)
    
    return job_data

def generate_html_template(jobs: List[Dict[str, Any]]) -> str:
    """Generate the complete HTML report"""
    
    # Calculate summary stats
    total_jobs = len(jobs)
    apply_count = len([j for j in jobs if j['recommendation'] == 'apply'])
    maybe_count = len([j for j in jobs if j['recommendation'] == 'maybe'])
    skip_count = len([j for j in jobs if j['recommendation'] == 'skip'])
    
    avg_fit_score = sum(j['fit_score'] or 0 for j in jobs) / total_jobs if total_jobs > 0 else 0
    
    # Convert jobs to JSON for JavaScript
    jobs_json = json.dumps(jobs, indent=2)
    
    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Job Search Results - {datetime.now().strftime('%Y-%m-%d')}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <style>
        /* Custom CSS for additional styling */
        .job-card {{
            transition: all 0.2s ease-in-out;
        }}
        .job-card:hover {{
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }}
        .recommendation-apply {{
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }}
        .recommendation-maybe {{
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }}
        .recommendation-skip {{
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }}
        .fit-score-bar {{
            transition: width 0.3s ease;
        }}
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-gray-900 mb-2">Job Search Results</h1>
            <p class="text-gray-600">Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow p-6 text-center">
                <div class="text-3xl font-bold text-gray-900">{total_jobs}</div>
                <div class="text-sm text-gray-600">Total Jobs</div>
            </div>
            <div class="bg-white rounded-lg shadow p-6 text-center">
                <div class="text-3xl font-bold text-green-600">{apply_count}</div>
                <div class="text-sm text-gray-600">Apply</div>
            </div>
            <div class="bg-white rounded-lg shadow p-6 text-center">
                <div class="text-3xl font-bold text-yellow-600">{maybe_count}</div>
                <div class="text-sm text-gray-600">Maybe</div>
            </div>
            <div class="bg-white rounded-lg shadow p-6 text-center">
                <div class="text-3xl font-bold text-red-600">{skip_count}</div>
                <div class="text-sm text-gray-600">Skip</div>
            </div>
            <div class="bg-white rounded-lg shadow p-6 text-center">
                <div class="text-3xl font-bold text-blue-600">{avg_fit_score:.1f}</div>
                <div class="text-sm text-gray-600">Avg Fit Score</div>
            </div>
        </div>

        <!-- Controls -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
            <div class="flex flex-wrap gap-4 items-center justify-between">
                <div class="flex flex-wrap gap-2">
                    <button id="filter-all" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                        All ({total_jobs})
                    </button>
                    <button id="filter-apply" class="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                        Apply ({apply_count})
                    </button>
                    <button id="filter-maybe" class="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors">
                        Maybe ({maybe_count})
                    </button>
                    <button id="filter-skip" class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                        Skip ({skip_count})
                    </button>
                </div>
                <div class="flex items-center gap-4">
                    <label class="text-sm text-gray-600">Sort by:</label>
                    <select id="sort-select" class="px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="fit_score">Fit Score</option>
                        <option value="date_posted">Date Posted</option>
                        <option value="company">Company</option>
                        <option value="title">Title</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Jobs Grid -->
        <div id="jobs-container" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <!-- Jobs will be rendered here by JavaScript -->
        </div>

        <!-- Empty State -->
        <div id="empty-state" class="text-center py-12 hidden">
            <i data-lucide="search" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p class="text-gray-600">Try adjusting your filters</p>
        </div>
    </div>

    <script>
        // Job data
        const jobsData = {jobs_json};
        
        // State
        let currentFilter = 'all';
        let currentSort = 'fit_score';
        
        // Initialize Lucide icons
        lucide.createIcons();
        
        // DOM elements
        const jobsContainer = document.getElementById('jobs-container');
        const emptyState = document.getElementById('empty-state');
        const sortSelect = document.getElementById('sort-select');
        
        // Filter buttons
        const filterButtons = {{
            'all': document.getElementById('filter-all'),
            'apply': document.getElementById('filter-apply'),
            'maybe': document.getElementById('filter-maybe'),
            'skip': document.getElementById('filter-skip')
        }};
        
        // Utility functions
        function formatDate(dateString) {{
            if (!dateString) return 'Not specified';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {{
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }});
        }}
        
        function getRecommendationColor(recommendation) {{
            switch(recommendation) {{
                case 'apply': return 'recommendation-apply';
                case 'maybe': return 'recommendation-maybe';
                case 'skip': return 'recommendation-skip';
                default: return 'bg-gray-500';
            }}
        }}
        
        function getFitScoreColor(score) {{
            if (score >= 4) return 'bg-green-500';
            if (score >= 3) return 'bg-yellow-500';
            if (score >= 2) return 'bg-orange-500';
            return 'bg-red-500';
        }}
        
        function createJobCard(job) {{
            const analysis = job.analysis_summary || {{}};
            const summary = analysis.summary || {{}};
            
            return `
                <div class="job-card bg-white rounded-lg shadow-md overflow-hidden" data-recommendation="${{job.recommendation}}">
                    <!-- Header -->
                    <div class="p-6 pb-4">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex-1">
                                <h3 class="text-xl font-semibold text-gray-900 mb-1">${{job.title || 'Unknown Title'}}</h3>
                                <p class="text-gray-600 flex items-center">
                                    <i data-lucide="building" class="w-4 h-4 mr-1"></i>
                                    ${{job.company || 'Unknown Company'}}
                                </p>
                            </div>
                            <div class="flex flex-col items-end gap-2">
                                <span class="px-3 py-1 text-xs font-semibold text-white rounded-full ${{getRecommendationColor(job.recommendation)}}">
                                    ${{job.recommendation?.toUpperCase() || 'UNKNOWN'}}
                                </span>
                                <div class="text-sm text-gray-500">
                                    Fit: ${{job.fit_score || 'N/A'}}/5
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center text-sm text-gray-600 mb-3">
                            <i data-lucide="map-pin" class="w-4 h-4 mr-1"></i>
                            <span>${{job.location || 'Location not specified'}}</span>
                            ${{job.salary_range ? `<span class="mx-2">•</span><span>${{job.salary_range}}</span>` : ''}}
                        </div>
                        
                        <!-- Fit Score Bar -->
                        <div class="mb-4">
                            <div class="flex justify-between text-sm mb-1">
                                <span class="text-gray-600">Fit Score</span>
                                <span class="font-semibold">${{job.fit_score || 0}}/5</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="fit-score-bar h-2 rounded-full ${{getFitScoreColor(job.fit_score)}}" 
                                     style="width: ${{((job.fit_score || 0) / 5) * 100}}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Content -->
                    <div class="px-6 pb-4">
                        ${{analysis.job_summary ? `
                            <div class="mb-4">
                                <h4 class="font-semibold text-gray-900 mb-2">Job Summary</h4>
                                <p class="text-sm text-gray-700">${{analysis.job_summary}}</p>
                            </div>
                        ` : ''}}
                        
                        ${{analysis.fit_summary ? `
                            <div class="mb-4">
                                <h4 class="font-semibold text-gray-900 mb-2">Fit Analysis</h4>
                                <p class="text-sm text-gray-700">${{analysis.fit_summary}}</p>
                            </div>
                        ` : ''}}
                        
                        ${{analysis.why_good_fit && analysis.why_good_fit.length > 0 ? `
                            <div class="mb-4">
                                <h4 class="font-semibold text-green-700 mb-2">Strengths</h4>
                                <ul class="text-sm text-gray-700 space-y-1">
                                    ${{analysis.why_good_fit.map(item => `<li class="flex items-start"><i data-lucide="check" class="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0"></i>${{item}}</li>`).join('')}}
                                </ul>
                            </div>
                        ` : ''}}
                        
                        ${{analysis.potential_concerns && analysis.potential_concerns.length > 0 ? `
                            <div class="mb-4">
                                <h4 class="font-semibold text-red-700 mb-2">Concerns</h4>
                                <ul class="text-sm text-gray-700 space-y-1">
                                    ${{analysis.potential_concerns.map(item => `<li class="flex items-start"><i data-lucide="alert-circle" class="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0"></i>${{item}}</li>`).join('')}}
                                </ul>
                            </div>
                        ` : ''}}
                    </div>
                    
                    <!-- Footer -->
                    <div class="px-6 py-4 bg-gray-50 border-t">
                        <div class="flex items-center justify-between">
                            <div class="text-sm text-gray-600">
                                Posted: ${{formatDate(job.date_posted)}}
                            </div>
                            <a href="${{job.url}}" target="_blank" rel="noopener noreferrer" 
                               class="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                <span>View Job</span>
                                <i data-lucide="external-link" class="w-4 h-4 ml-1"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }}
        
        function filterJobs() {{
            let filtered = jobsData;
            
            // Apply recommendation filter
            if (currentFilter !== 'all') {{
                filtered = filtered.filter(job => job.recommendation === currentFilter);
            }}
            
            return filtered;
        }}
        
        function sortJobs(jobs) {{
            return [...jobs].sort((a, b) => {{
                switch(currentSort) {{
                    case 'fit_score':
                        return (b.fit_score || 0) - (a.fit_score || 0);
                    case 'date_posted':
                        return new Date(b.date_posted || 0) - new Date(a.date_posted || 0);
                    case 'company':
                        return (a.company || '').localeCompare(b.company || '');
                    case 'title':
                        return (a.title || '').localeCompare(b.title || '');
                    default:
                        return 0;
                }}
            }});
        }}
        
        function renderJobs() {{
            const filtered = filterJobs();
            const sorted = sortJobs(filtered);
            
            if (sorted.length === 0) {{
                jobsContainer.classList.add('hidden');
                emptyState.classList.remove('hidden');
                return;
            }}
            
            jobsContainer.classList.remove('hidden');
            emptyState.classList.add('hidden');
            
            jobsContainer.innerHTML = sorted.map(createJobCard).join('');
            
            // Re-initialize Lucide icons for new content
            lucide.createIcons();
        }}
        
        function updateFilterButtons() {{
            Object.entries(filterButtons).forEach(([filter, button]) => {{
                if (filter === currentFilter) {{
                    button.classList.add('bg-blue-500', 'text-white');
                    button.classList.remove('bg-gray-200', 'text-gray-700', 'bg-green-100', 'text-green-700', 'bg-yellow-100', 'text-yellow-700', 'bg-red-100', 'text-red-700');
                }} else {{
                    button.classList.remove('bg-blue-500', 'text-white');
                    switch(filter) {{
                        case 'all':
                            button.classList.add('bg-gray-200', 'text-gray-700');
                            break;
                        case 'apply':
                            button.classList.add('bg-green-100', 'text-green-700');
                            break;
                        case 'maybe':
                            button.classList.add('bg-yellow-100', 'text-yellow-700');
                            break;
                        case 'skip':
                            button.classList.add('bg-red-100', 'text-red-700');
                            break;
                    }}
                }}
            }});
        }}
        
        // Event listeners
        Object.entries(filterButtons).forEach(([filter, button]) => {{
            button.addEventListener('click', () => {{
                currentFilter = filter;
                updateFilterButtons();
                renderJobs();
            }});
        }});
        
        sortSelect.addEventListener('change', (e) => {{
            currentSort = e.target.value;
            renderJobs();
        }});
        
        // Initial render
        updateFilterButtons();
        renderJobs();
    </script>
</body>
</html>"""
    
    return html_template

def main():
    """Main function to generate and open the HTML report"""
    print("Generating job search report...")
    
    try:
        # Fetch job data
        jobs = get_job_data()
        print(f"Found {len(jobs)} jobs in database")
        
        # Generate HTML
        html_content = generate_html_template(jobs)
        
        # Write to file
        output_file = "job_results.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"Report generated: {output_file}")
        
        # Open in browser
        file_path = os.path.abspath(output_file)
        webbrowser.open(f"file://{file_path}")
        print("Opening report in browser...")
        
    except Exception as e:
        print(f"Error generating report: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())