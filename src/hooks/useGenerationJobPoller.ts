import { apiClient } from "@/lib/apiClient";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface GenerationJob {
  id: string;
  project_id: string;
  job_type: string;
  status: string;
  total_batches: number;
  completed_batches: number;
  failed_batches: number;
  scripts_generated: number;
  total_items: number;
  percentage: number;
  phase: string;
  error_message: string | null;
  credits_exhausted: boolean;
  partial: boolean;
  created_at: string;
  updated_at: string;
}

interface UseGenerationJobPollerOptions {
  projectId: string | null;
  jobId: string | null;
  onComplete?: (job: GenerationJob) => void;
  onError?: (job: GenerationJob) => void;
}

export function useGenerationJobPoller({ projectId, jobId, onComplete, onError }: UseGenerationJobPollerOptions) {
  // Warn earlier so users get feedback faster; then force-fail non-pipeline stale jobs.
  const STALE_WARN_TIMEOUT_MS = 45 * 1000;
  const STALE_FAIL_TIMEOUT_MS = 45 * 1000;

  const [job, setJob] = useState<GenerationJob | null>(null);
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const staleWarnedRef = useRef(false);
  const staleResumeTriedRef = useRef(false);
  const staleResumeInFlightRef = useRef(false);
  const staleForceFailedRef = useRef(false);

  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
  }, []);

  const startPolling = useCallback((jid: string) => {
    stopPolling();
    setPolling(true);
    staleWarnedRef.current = false;
    staleResumeTriedRef.current = false;
    staleResumeInFlightRef.current = false;
    staleForceFailedRef.current = false;

    const poll = async () => {
      try {
        if (!projectId) return;

        // Use the new FastAPI endpoint for polling the latest job status
        const jobData = await apiClient.get<GenerationJob>(`/projects/${projectId}/jobs/latest`);

        if (!jobData || jobData.status === "idle") return;

        setJob(jobData);

        if (jobData.status === "running") {
          const updatedAtMs = new Date(jobData.updated_at).getTime();
          const staleMs = Number.isFinite(updatedAtMs) ? Date.now() - updatedAtMs : 0;
          const isWarnStale = Number.isFinite(updatedAtMs) && staleMs > STALE_WARN_TIMEOUT_MS;
          
          if (isWarnStale && !staleWarnedRef.current) {
            staleWarnedRef.current = true;
            toast.warning("Generation is taking longer than expected. Still waiting for backend progress...");
          }
          // Note: Force-fail and auto-resume logic is now managed by the agentic backend.
        }

        if (jobData.status === "completed") {
          stopPolling();
          const label = jobData.job_type === "requirements" ? "requirements"
            : (jobData.job_type === "test_cases" || jobData.job_type === "test_cases_pipeline") ? "test cases"
            : "automation scripts";
          
          if (jobData.partial) {
            toast.warning(`Partial: ${jobData.scripts_generated || 0} ${label} generated. Some batches failed.`);
          } else {
            toast.success(`Generated & saved ${jobData.scripts_generated || 0} ${label}!`);
          }
          onCompleteRef.current?.(jobData);
        } else if (jobData.status === "failed") {
          stopPolling();
          toast.error(jobData.error_message || "Generation failed");
          onErrorRef.current?.(jobData);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Poll immediately, then every 2s for quicker status pickup.
    poll();
    intervalRef.current = setInterval(poll, 2000);
  }, [stopPolling, projectId, STALE_WARN_TIMEOUT_MS, STALE_FAIL_TIMEOUT_MS]);

  // Auto-start if jobId provided
  useEffect(() => {
    if (jobId) {
      startPolling(jobId);
    }
    return () => stopPolling();
  }, [jobId, startPolling, stopPolling]);

  return { job, polling, startPolling, stopPolling };
}

/**
 * Global hook: checks for any running generation jobs for a project.
 * Shows toast when they complete, even if user navigated away.
 * Uses polling instead of Supabase realtime.
 */
export function useActiveGenerationJobs(projectId: string | null) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Poll for active jobs every 5 seconds
  useEffect(() => {
    if (!projectId) return;

    const check = async () => {
      try {
        const job = await apiClient.get<any>(`/projects/${projectId}/jobs/latest`);
        if (job && job.status === "running") {
          setActiveJobId(job.id);
        } else {
          setActiveJobId(null);
        }
      } catch (_) {}
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const { job, polling } = useGenerationJobPoller({
    projectId,
    jobId: activeJobId,
    onComplete: () => setActiveJobId(null),
    onError: () => setActiveJobId(null),
  });

  const cancelJob = async () => {
    if (!job || job.status !== "running") return;
    // No cancel endpoint on FastAPI yet — just stop polling locally
    setActiveJobId(null);
    toast.info("Stopped monitoring job.");
  };

  return { activeJob: job, isRunning: polling, cancelJob };
}
