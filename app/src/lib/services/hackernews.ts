interface HackerNewsItem {
  id: number;
  type: 'story' | 'comment';
  by: string;
  time: number;
  text?: string;
  kids?: number[];
  parent?: number;
  title?: string;
  url?: string;
}

export interface Comment {
  id: number;
  author: string;
  text: string;
  time: number;
}

export interface HackerNewsThread {
  id: number;
  title: string;
  author: string;
  time: number;
  url?: string;
  commentCount: number;
}

export interface HackerNewsResponse {
  thread: HackerNewsThread;
  comments: Comment[];
}

export async function fetchHNItem(id: number, useCache: boolean = true): Promise<HackerNewsItem | null> {
  try {
    const fetchOptions: RequestInit = {};
    
    // Only use Next.js cache options when available (in Next.js environment)
    if (useCache && typeof window === 'undefined' && 'next' in globalThis) {
      (fetchOptions as any).next = {
        revalidate: 300,
      };
    }
    
    const response = await fetch(
      `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
      fetchOptions
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error fetching HN item ${id}:`, error);
    return null;
  }
}

export async function fetchTopLevelComments(commentIds: number[], useCache: boolean = true): Promise<Comment[]> {
  if (!commentIds?.length) return [];
  
  const comments: Comment[] = [];
  
  // Fetch comments in parallel
  const commentPromises = commentIds.map(id => fetchHNItem(id, useCache));
  const commentItems = await Promise.all(commentPromises);
  
  for (const item of commentItems) {
    if (!item || item.type !== 'comment' || !item.text) continue;
    
    comments.push({
      id: item.id,
      author: item.by || 'unknown',
      text: item.text,
      time: item.time,
    });
  }
  
  return comments;
}

export async function fetchHackerNewsThread(threadId: string): Promise<HackerNewsResponse> {
  // Fetch the main thread item
  const threadItem = await fetchHNItem(parseInt(threadId));
  
  if (!threadItem) {
    throw new Error('Thread not found');
  }
  
  // Fetch only top-level comments
  const comments = threadItem.kids ? await fetchTopLevelComments(threadItem.kids) : [];
  
  return {
    thread: {
      id: threadItem.id,
      title: threadItem.title || 'No title',
      author: threadItem.by || 'unknown',
      time: threadItem.time,
      url: threadItem.url,
      commentCount: comments.length
    },
    comments
  };
}

interface HiringThread {
    id: string;
    title: string;
    url: string;
    created_at: string;
    points: number;
    num_comments: number;
    type: 'hiring' | 'freelance' | 'seeking' | 'other';
  }
  
  /**
   * Fetches all threads from the official whoishiring account
   * Includes hiring, freelance, job seeking, and other threads
   * 
   * @returns Promise containing array of threads, sorted by date (newest first)
   */
  export async function getHiringThreads(): Promise<HiringThread[]> {
    try {
      const params = new URLSearchParams({
        query: '',
        tags: 'story,author_whoishiring',
        hitsPerPage: '20'
      });
  
      const response = await fetch(`https://hn.algolia.com/api/v1/search_by_date?${params}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Map all threads and categorize them
      return data.hits
        .map((hit: any) => {
          const title = hit.title.toLowerCase();
          let type: 'hiring' | 'freelance' | 'seeking' | 'other' = 'other';
          
          if (title.includes('who is hiring') || title.includes('who\'s hiring')) {
            type = 'hiring';
          } else if (title.includes('freelancer') || title.includes('seeking freelance')) {
            type = 'freelance';
          } else if (title.includes('wants to be hired') || title.includes('seeking work')) {
            type = 'seeking';
          }
          
          return {
            id: hit.objectID,
            title: hit.title,
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            created_at: hit.created_at,
            points: hit.points,
            num_comments: hit.num_comments,
            type
          };
        }); // API already sorts by date, no need to sort again
  
    } catch (error) {
      console.error('Failed to fetch hiring threads:', error);
      return [];
    }
  }