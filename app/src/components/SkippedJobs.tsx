interface SkippedJob {
  title: string;
  company: string;
  reason: string;
}

interface SkippedJobsProps {
  skippedJobs: SkippedJob[];
}

export default function SkippedJobs({ skippedJobs }: SkippedJobsProps) {
  if (skippedJobs.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <details className="bg-gray-50 rounded-lg p-4">
        <summary className="cursor-pointer text-gray-700 font-medium">
          Skipped Jobs ({skippedJobs.length})
        </summary>
        <div className="mt-4 space-y-2">
          {skippedJobs.map((job, index) => (
            <div key={index} className="text-sm text-gray-600 border-l-2 border-gray-300 pl-3">
              <strong>{job.title}</strong> at {job.company} - {job.reason}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}