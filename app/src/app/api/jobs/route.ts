import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const jobs = await prisma.processedJob.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform jobs to include parsed JSON fields
    const transformedJobs = jobs.map(job => ({
      ...job,
      why_good_fit: job.whyGoodFit ? JSON.parse(job.whyGoodFit) : [],
      potential_concerns: job.potentialConcerns ? JSON.parse(job.potentialConcerns) : [],
      key_technologies: job.keyTechnologies ? JSON.parse(job.keyTechnologies) : [],
      job_summary: job.jobSummary,
      fit_summary: job.fitSummary
    }));

    return NextResponse.json({ jobs: transformedJobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}