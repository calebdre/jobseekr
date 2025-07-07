import { NextRequest, NextResponse } from 'next/server';
import { fetchHackerNewsThread } from '@/lib/services/hackernews';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');
    
    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' }, 
        { status: 400 }
      );
    }
    
    const result = await fetchHackerNewsThread(threadId);
    
    // Add replies array to maintain backward compatibility
    const commentsWithReplies = result.comments.map(comment => ({
      ...comment,
      replies: [] // No nested replies for top-level only
    }));
    
    return NextResponse.json({
      thread: result.thread,
      comments: commentsWithReplies
    });
    
  } catch (error) {
    console.error('Error fetching HackerNews comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' }, 
      { status: 500 }
    );
  }
}