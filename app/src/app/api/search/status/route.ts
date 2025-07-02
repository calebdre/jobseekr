import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check for active search session (not expired)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const activeSession = await prisma.searchSession.findFirst({
      where: {
        userId,
        status: {
          in: ['pending', 'in_progress', 'paused']
        },
        createdAt: {
          gte: twoHoursAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!activeSession) {
      return NextResponse.json({ 
        hasActiveSearch: false,
        session: null 
      });
    }

    return NextResponse.json({
      hasActiveSearch: true,
      session: {
        id: activeSession.id,
        status: activeSession.status,
        progress: activeSession.progress,
        jobTitle: activeSession.jobTitle,
        createdAt: activeSession.createdAt,
        updatedAt: activeSession.updatedAt
      }
    });

  } catch (error) {
    console.error('Error checking search status:', error);
    return NextResponse.json({ error: 'Failed to check search status' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Pause active search instead of cancelling
    const result = await prisma.searchSession.updateMany({
      where: {
        userId,
        status: {
          in: ['pending', 'in_progress']
        }
      },
      data: {
        status: 'paused',
        updatedAt: new Date()
        // Note: We don't set completedAt for paused sessions, and preserve existing progress
      }
    });

    return NextResponse.json({ 
      paused: result.count > 0,
      pausedCount: result.count 
    });

  } catch (error) {
    console.error('Error cancelling search:', error);
    return NextResponse.json({ error: 'Failed to cancel search' }, { status: 500 });
  }
}