import { useEditorStore } from '../../store/editorStore';
import { useSSE } from '../../hooks/useSSE';

/**
 * Component that manages SSE connections for all active jobs
 * Renders nothing, just manages connections
 */
export function JobSSEManager({ demoMode = false }: { demoMode?: boolean }) {
  const jobs = useEditorStore((state) => state.jobs);

  // Get all active jobs (queued or generating)
  const allJobs = Array.from(jobs.values());
  const activeJobs = allJobs.filter((j) => j.status === 'queued' || j.status === 'generating');

  // Render a hidden component for each active job to manage SSE
  // This is a workaround for React hooks rules - we can't call hooks in loops
  return (
    <>
      {activeJobs.map((job) => (
        <JobSSEConnector key={job.id} jobId={job.id} demoMode={demoMode} />
      ))}
    </>
  );
}

function JobSSEConnector({ jobId, demoMode }: { jobId: string; demoMode: boolean }) {
  useSSE(jobId, demoMode);
  return null; // This component doesn't render anything
}
