import { GoogleSearchItem, GoogleSearchResponse } from '@/types';

export async function searchJobs(
  query: string = "software engineer jobs",
  startIndex: number = 1,
  batchSize: number = 30
): Promise<{items: GoogleSearchItem[], totalResults: number}> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    throw new Error("Missing Google Custom Search API credentials");
  }

  const jobQuery = `${query}`;
  const allItems: GoogleSearchItem[] = [];
  let totalResults = 0;
  
  // Calculate how many API calls we need (max 10 results per call)
  const numCalls = Math.ceil(batchSize / 10);
  
  try {
    console.log(`Searching for: ${jobQuery} (batch: ${batchSize}, starting at: ${startIndex})`);
    
    // Create all API call promises in parallel
    const apiPromises = [];
    for (let i = 0; i < numCalls; i++) {
      const currentStart = startIndex + (i * 10);
      const currentNum = Math.min(10, batchSize - (i * 10));
      
      if (currentNum <= 0) break;
      
      const url = new URL("https://www.googleapis.com/customsearch/v1");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("cx", searchEngineId);
      url.searchParams.set("q", jobQuery);
      url.searchParams.set("num", currentNum.toString());
      url.searchParams.set("start", currentStart.toString());
      url.searchParams.set("dateRestrict", "d7"); // Last 7 days (covers 5 business days)
      
      console.log(`API call ${i + 1}/${numCalls}: requesting ${currentNum} results starting at ${currentStart}`);
      
      apiPromises.push(
        fetch(url.toString()).then(async (response) => {
          if (!response.ok) {
            throw new Error(`Google Search API error: ${response.status} ${response.statusText}`);
          }
          const data: GoogleSearchResponse = await response.json();
          return { data, callIndex: i };
        })
      );
    }
    
    // Execute all API calls in parallel
    const results = await Promise.all(apiPromises);
    
    // Process results in order
    for (const { data, callIndex } of results) {
      // Get total results from first call
      if (callIndex === 0) {
        totalResults = parseInt(data.searchInformation?.totalResults || '0');
        console.log(`Total results available: ${totalResults}`);
      }
      
      if (data.items && data.items.length > 0) {
        allItems.push(...data.items);
        console.log(`Retrieved ${data.items.length} results from call ${callIndex + 1}`);
      } else {
        console.log(`No results available from call ${callIndex + 1}`);
      }
    }
    
    console.log(`Batch complete: Retrieved ${allItems.length} total results`);
    return { items: allItems, totalResults };
    
  } catch (error) {
    console.error("Error searching jobs:", error);
    throw error;
  }
}