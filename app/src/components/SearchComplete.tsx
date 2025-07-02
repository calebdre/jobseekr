import { ProcessedJob } from "@/types";

interface SearchCompleteProps {
  jobResults: ProcessedJob[];
}

export default function SearchComplete({ jobResults }: SearchCompleteProps) {
  const appliedJobs = jobResults.filter(job => job.recommendation === 'apply');

  return (
    <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-green-800 mb-2">Search Complete!</h3>
      <p className="text-green-700">
        Found {jobResults.length} job{jobResults.length !== 1 ? 's' : ''} to analyze.
        {appliedJobs.length > 0 && (
          <span className="block mt-1 font-medium">
            🎯 {appliedJobs.length} job{appliedJobs.length !== 1 ? 's' : ''} recommended for application!
          </span>
        )}
      </p>
    </div>
  );
}