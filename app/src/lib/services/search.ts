import { GoogleSearchItem, GoogleSearchResponse } from '@/types';
import { prisma } from '@/lib/db';

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

/**
 * Fetches new jobs with duplicate handling - ensures we get the target batch size of new jobs
 * by making additional API calls if duplicates are filtered out.
 */
export async function fetchNewJobsWithDuplicateHandling(
  jobTitle: string,
  userId: string,
  currentPage: number,
  targetBatchSize: number = 30,
  maxAdditionalPages: number = 3
): Promise<{items: GoogleSearchItem[], totalResults: number, finalPage: number}> {
  try {
    // First, get all existing job URLs for this user to filter duplicates
    const existingJobs = await prisma.processedJob.findMany({
      where: { userId },
      select: { url: true }
    });
    const existingUrls = new Set(existingJobs.map(job => job.url));
    
    const allNewItems: GoogleSearchItem[] = [];
    let totalResults = 0;
    let currentPageNum = currentPage;
    let pagesSearched = 0;
    const maxPages = maxAdditionalPages + 1; // Include the initial page
    
    while (allNewItems.length < targetBatchSize && pagesSearched < maxPages) {
      // Calculate start index based on current page (assuming 30 results per page)
      const startIndex = ((currentPageNum - 1) * 30) + 1;
      
      console.log(`Fetching page ${currentPageNum} (startIndex: ${startIndex}) - attempt ${pagesSearched + 1}/${maxPages}`);
      
      try {
        const { items, totalResults: apiTotalResults } = await searchJobs(
          jobTitle,
          startIndex,
          targetBatchSize
        );
        
        // Update total results from first successful call
        if (pagesSearched === 0) {
          totalResults = apiTotalResults;
        }
        
        // Filter out duplicates
        const newItems = items.filter(item => !existingUrls.has(item.link));
        
        console.log(`Page ${currentPageNum}: Got ${items.length} results, ${newItems.length} new after filtering duplicates`);
        
        allNewItems.push(...newItems);
        
        // If we didn't get any results from this page, we've likely reached the end
        if (items.length === 0) {
          console.log(`No more results available at page ${currentPageNum}`);
          break;
        }
        
        // Move to next page for next iteration
        currentPageNum++;
        pagesSearched++;
        
        // If we got fewer results than expected, we might be near the end of available results
        if (items.length < targetBatchSize) {
          console.log(`Got fewer results than expected (${items.length} < ${targetBatchSize}), likely near end of results`);
          break;
        }
        
      } catch (error) {
        console.error(`Error fetching page ${currentPageNum}:`, error);
        // If rate limited or other API error, process what we have
        break;
      }
    }
    
    // Calculate duplicate ratio for logging
    const duplicateRatio = existingUrls.size > 0 ? 
      (pagesSearched * targetBatchSize - allNewItems.length) / (pagesSearched * targetBatchSize) : 0;
    
    console.log(`Duplicate handling complete: Got ${allNewItems.length} new jobs from ${pagesSearched} page(s). Duplicate ratio: ${(duplicateRatio * 100).toFixed(1)}%`);
    
    return {
      items: allNewItems.slice(0, targetBatchSize), // Ensure we don't exceed target
      totalResults,
      finalPage: currentPageNum - 1 // Return the last successful page
    };
    
  } catch (error) {
    console.error("Error in fetchNewJobsWithDuplicateHandling:", error);
    throw error;
  }
}