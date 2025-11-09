import { useEditorStore } from '../../store/editorStore';
import { cancelJob } from '../../api/jobs';
import type { Job } from '../../types';

interface JobRowProps {
  job: Job;
  onRevealInAssets?: (jobId: string) => void;
}

export function JobRow({ job, onRevealInAssets }: JobRowProps) {
  const updateJob = useEditorStore((state) => state.updateJob);
  const assets = useEditorStore((state) => state.assets);
  const setSelection = useEditorStore((state) => state.setSelection);

  const handleCancel = async () => {
    try {
      const cancelledJob = await cancelJob(job.id);
      updateJob(cancelledJob);
    } catch (error) {
      console.error('Failed to cancel job:', error);
      // Update to error state even if API call fails
      updateJob({
        ...job,
        status: 'error',
        error: 'Failed to cancel job',
        updatedAt: Date.now(),
      });
    }
  };

  const handleRetry = () => {
    // Reset job to queued state for retry
    updateJob({
      ...job,
      status: 'queued',
      progress: 0,
      error: undefined,
      updatedAt: Date.now(),
    });
  };

  const handleRevealInAssets = () => {
    if (job.url) {
      // Find asset with this URL
      const asset = Array.from(assets.values()).find((a) => a.url === job.url);
      if (asset) {
        // Could scroll to asset or highlight it
        onRevealInAssets?.(job.id);
      }
    }
  };

  const statusColors: Record<Job['status'], string> = {
    queued: 'bg-gray-600',
    generating: 'bg-blue-600',
    complete: 'bg-green-600',
    error: 'bg-red-600',
  };

  const statusLabels: Record<Job['status'], string> = {
    queued: 'Queued',
    generating: 'Generating',
    complete: 'Complete',
    error: 'Error',
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-1 rounded text-white ${statusColors[job.status]}`}>
              {statusLabels[job.status]}
            </span>
            {job.status === 'generating' && (
              <span className="text-xs text-gray-400">{job.progress}%</span>
            )}
            <span className="text-xs text-gray-500">
              {new Date(job.createdAt).toLocaleTimeString()}
            </span>
          </div>
          {job.error && (
            <p className="text-xs text-red-400 mt-1">{job.error}</p>
          )}
          {job.url && (
            <p className="text-xs text-gray-400 mt-1 truncate" title={job.url}>
              {job.url.split('/').pop()?.split('?')[0]}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar for generating jobs */}
      {job.status === 'generating' && (
        <div className="mb-2">
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        {job.status === 'queued' || job.status === 'generating' ? (
          <button
            onClick={handleCancel}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Cancel
          </button>
        ) : null}
        {job.status === 'error' && (
          <button
            onClick={handleRetry}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Retry
          </button>
        )}
        {job.status === 'complete' && job.url && (
          <button
            onClick={handleRevealInAssets}
            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Reveal in Assets
          </button>
        )}
      </div>
    </div>
  );
}
