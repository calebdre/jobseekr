import { GoogleSearchItem } from '../services/search';

export interface JobData {
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  url: string;
  snippet: string;
}

export function parseJobFromSearch(searchResult: GoogleSearchItem): JobData {
  const title = searchResult.title || "Unknown Title";
  const company = extractCompany(searchResult.displayLink, searchResult.snippet);
  const location = extractLocation(searchResult.snippet);
  const salary = extractSalary(searchResult.snippet);
  
  return {
    title: cleanTitle(title),
    company,
    location,
    salary,
    url: searchResult.link,
    snippet: searchResult.snippet || ""
  };
}

function cleanTitle(title: string): string {
  // Remove common job board suffixes
  return title
    .replace(/\s*-\s*(LinkedIn|Indeed|Glassdoor|AngelList).*$/i, "")
    .replace(/\s*\|\s*.*$/, "")
    .trim();
}

function extractCompany(displayLink: string, snippet: string): string {
  // Try to extract company from domain
  if (displayLink.includes("linkedin.com")) {
    const match = snippet.match(/at\s+([^·\-\|]+)/i);
    if (match) return match[1].trim();
  }
  
  // Fallback to domain name
  const domain = displayLink.replace(/^www\./, "").split(".")[0];
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

function extractLocation(text: string): string | null {
  // Common location patterns
  const locationPatterns = [
    /(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*[A-Z]{2})/,
    /([A-Z][a-z]+,\s*[A-Z]{2})/,
    /(Remote|Hybrid|On-site)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+,?\s*[A-Z]{2,})/
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractSalary(text: string): string | null {
  // Salary patterns
  const salaryPatterns = [
    /\$[\d,]+(?:\s*-\s*\$?[\d,]+)?(?:\s*per\s+year|\/year|\/yr|annually)?/i,
    /[\d,]+k(?:\s*-\s*[\d,]+k)?(?:\s*per\s+year|\/year|\/yr|annually)?/i,
    /\$[\d,]+(?:\s*-\s*\$?[\d,]+)?(?:\s*per\s+hour|\/hour|\/hr|hourly)?/i
  ];
  
  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return null;
}

export function generateContentHash(content: string): string {
  // Simple hash function for content change detection
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}