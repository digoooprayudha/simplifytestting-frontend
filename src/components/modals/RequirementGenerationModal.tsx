import { useState, useEffect, useCallback } from "react";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { useWizard } from "@/lib/wizardContext";
import { useGenerationJobPoller, GenerationJob } from "@/hooks/useGenerationJobPoller";
import ModelPicker from "@/components/ModelPicker";

interface RequirementGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentIds: string[];
  onComplete?: () => void;
}

const RequirementGenerationModal = ({ open, onOpenChange, documentIds, onComplete }: RequirementGenerationModalProps) => {
  const { projectId, projectSettings } = useWizard();
  const [model, setModel] = useState(projectSettings.ai_model);
  const [error, setError] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [startingGeneration, setStartingGeneration] = useState(false);

  useEffect(() => {
    setModel(projectSettings.ai_model);
  }, [projectSettings.ai_model]);

  const handleJobComplete = useCallback((completedJob: GenerationJob) => {
    setCurrentJobId(null);
    setError(null);
    onComplete?.();
  }, [onComplete]);

  const handleJobError = useCallback((failedJob: GenerationJob) => {
    setError(failedJob.error_message || "Extraction failed");
    setCurrentJobId(null);
  }, []);

  const { job, polling: generating } = useGenerationJobPoller({
    projectId,
    jobId: currentJobId,
    onComplete: handleJobComplete,
    onError: handleJobError,
  });

  const isBusy = generating || startingGeneration;

  const handleGenerate = async () => {
    if (!projectId) {
      toast.error("No project selected");
      return;
    }

    setStartingGeneration(true);
    setError(null);

    try {
      // Use FastAPI pipeline — pass document_id if available, else backend uses all docs
      const docId = documentIds[0] || "";
      await apiClient.post("/pipelines/extract-requirements", {
        project_id: projectId,
        document_id: docId,
        ai_model: model,
      });

      // Start polling
      setCurrentJobId("polling");
      toast.info(`Started extraction for ${documentIds.length} document(s)`);
    } catch (err: any) {
      setError(err.message || "Failed to start extraction");
      toast.error(err.message || "Failed to start extraction");
    } finally {
      setStartingGeneration(false);
    }
  };

  const progressLabel = job
    ? job.phase === "starting" ? "Initializing..."
    : job.phase === "complete" ? "Complete!"
    : `Document ${job.completed_batches + job.failed_batches}/${job.total_batches} • ${job.scripts_generated} requirements`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Requirements
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">AI Model</span>
            <ModelPicker value={model} onChange={setModel} disabled={isBusy} compact />
          </div>

          <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
            <p>{documentIds.length} document(s) will be processed to extract requirements.</p>
          </div>

          {generating && job && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">{progressLabel}</span>
                <span className="font-mono text-primary font-semibold">{job.percentage}%</span>
              </div>
              <Progress value={job.percentage} className="h-2" />
              <p className="text-[10px] text-muted-foreground italic">💡 You can close this — extraction continues in background.</p>
            </div>
          )}

          {job && job.status === "completed" && !generating && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">{job.scripts_generated} requirements extracted</span>
            </div>
          )}

          {error && !generating && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-xs">
              <div className="flex items-center gap-2 text-destructive font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Extraction failed
              </div>
              <p className="text-destructive/80 mt-1">{error}</p>
            </div>
          )}

          <Button onClick={handleGenerate} disabled={isBusy || documentIds.length === 0} className="w-full gap-2">
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isBusy ? "Extracting..." : "Extract Requirements"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequirementGenerationModal;
