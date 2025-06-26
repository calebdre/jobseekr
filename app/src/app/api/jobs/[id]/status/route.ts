import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    // Validate status
    const validStatuses = ['unread', 'applied', 'not_interested', 'saved_for_later'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Update job status
    const updatedJob = await prisma.processedJob.update({
      where: { id },
      data: {
        status,
        statusUpdatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      job: {
        id: updatedJob.id,
        status: updatedJob.status,
        statusUpdatedAt: updatedJob.statusUpdatedAt
      }
    });

  } catch (error) {
    console.error('Error updating job status:', error);
    return NextResponse.json(
      { error: 'Failed to update job status' },
      { status: 500 }
    );
  }
}