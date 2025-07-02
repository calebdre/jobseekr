interface BatchInfo {
  message: string;
  batch_processed: number;
  total_processed: number;
  remaining: number;
  total_applied: number;
}

interface BatchCompleteProps {
  batchInfo: BatchInfo;
  isSearching: boolean;
  onContinueSearch: () => void;
  onStopBatch: () => void;
}

export default function BatchComplete({ 
  batchInfo, 
  isSearching, 
  onContinueSearch, 
  onStopBatch 
}: BatchCompleteProps) {
  return (
    <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-green-800 mb-2">Batch Complete!</h3>
      <p className="text-green-700 mb-4">{batchInfo.message}</p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <div className="text-gray-600">This Batch</div>
          <div className="text-lg font-semibold text-green-800">{batchInfo.batch_processed}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <div className="text-gray-600">Total Processed</div>
          <div className="text-lg font-semibold text-green-800">{batchInfo.total_processed}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <div className="text-gray-600">Remaining</div>
          <div className="text-lg font-semibold text-blue-800">{batchInfo.remaining}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <div className="text-gray-600">To Apply</div>
          <div className="text-lg font-semibold text-green-800">{batchInfo.total_applied}</div>
        </div>
      </div>
      
      <div className="flex gap-4">
        <button
          onClick={onContinueSearch}
          disabled={isSearching}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          {isSearching ? 'Processing...' : `Continue (${batchInfo.remaining} remaining)`}
        </button>
        <button
          onClick={onStopBatch}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Stop Here
        </button>
      </div>
    </div>
  );
}