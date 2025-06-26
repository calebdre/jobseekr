import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const { jobIds, status } = await request.json();

    // Validate input
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: 'jobIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['unread', 'applied', 'not_interested', 'saved_for_later'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Update multiple jobs
    const result = await prisma.processedJob.updateMany({
      where: { 
        id: { in: jobIds }
      },
      data: {
        status,
        statusUpdatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      updatedCount: result.count 
    });

  } catch (error) {
    console.error('Error updating job statuses:', error);
    return NextResponse.json(
      { error: 'Failed to update job statuses' },
      { status: 500 }
    );
  }
}