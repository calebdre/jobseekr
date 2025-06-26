// Search-related types and interfaces

export interface SearchProgress {
  current: number;
  total: number;
  status: string;
}

export interface SearchSession {
  id: string;
  userId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    message: string;
  };
  jobTitle: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type SearchSessionUpdate = SearchSession;

export interface GoogleSearchItem {
  kind: string;
  title: string;
  htmlTitle: string;
  link: string;
  displayLink: string;
  snippet: string;
  htmlSnippet: string;
  formattedUrl: string;
  htmlFormattedUrl: string;
  pagemap?: {
    cse_thumbnail?: Array<{
      src: string;
      width: string;
      height: string;
    }>;
    metatags?: Array<Record<string, string>>;
    cse_image?: Array<{
      src: string;
    }>;
  };
}

export interface GoogleSearchResponse {
  kind: string;
  url: {
    type: string;
    template: string;
  };
  queries: {
    request: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
      inputEncoding: string;
      outputEncoding: string;
      safe: string;
      cx: string;
    }>;
  };
  context: {
    title: string;
  };
  searchInformation: {
    searchTime: number;
    formattedSearchTime: string;
    totalResults: string;
    formattedTotalResults: string;
  };
  items?: GoogleSearchItem[];
}

export type SearchFilter = 'all' | 'to_apply' | 'unread' | 'applied' | 'saved_for_later' | 'not_interested';