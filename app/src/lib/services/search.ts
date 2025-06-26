import { GoogleSearchItem, GoogleSearchResponse } from '@/types';

export async function searchJobs(query: string = "software engineer jobs"): Promise<GoogleSearchItem[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    throw new Error("Missing Google Custom Search API credentials");
  }

  // Add job-specific search terms and recent date filter
  const jobQuery = `${query}`;
  
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", searchEngineId);
  url.searchParams.set("q", jobQuery);
  url.searchParams.set("num", "10"); // Max results per request
  url.searchParams.set("dateRestrict", "d3"); // Last 3 days
  
  try {
    console.log(`Searching for: ${jobQuery}`);
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status} ${response.statusText}`);
    }
    
    const data: GoogleSearchResponse = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log("No search results found");
      return [];
    }
    
    console.log(`Found ${data.items.length} search results`);
    return data.items;
    
  } catch (error) {
    console.error("Error searching jobs:", error);
    throw error;
  }
}