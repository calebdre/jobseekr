interface JinaResponse {
  data: {
    title: string;
    content: string;
    url: string;
  };
}

export async function fetchJobContent(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  
  try {
    console.log(`Fetching content from: ${url}`);
    
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'JobSeekr/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Jina AI API error: ${response.status} ${response.statusText}`);
    }
    
    const data: JinaResponse = await response.json();
    
    if (!data.data?.content) {
      throw new Error("No content returned from Jina AI");
    }
    
    console.log(`Successfully fetched ${data.data.content.length} characters of content`);
    return data.data.content;
    
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    // Return a fallback with just the URL if content fetching fails
    return `Job posting URL: ${url}\nContent could not be retrieved.`;
  }
}

// Add retry logic with exponential backoff
export async function fetchJobContentWithRetry(url: string, maxRetries: number = 3): Promise<string> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchJobContent(url);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retry ${attempt}/${maxRetries} for ${url} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}