import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, CheckCircle2, FileText, Figma, FolderCode, Layers, ShieldCheck, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { useWizard } from "@/lib/wizardContext";
import { useGenerationJobPoller, GenerationJob } from "@/hooks/useGenerationJobPoller";
import ModelPicker from "@/components/ModelPicker";

interface TestCaseGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  starting: "Initializing pipeline...",
  generating: "Pass 1: Per-requirement generation",
  enhancing: "Pass 2-4: E2E, Coverage & Negative",
  reviewing: "Pass 5: AI Review & Deduplication",
  complete: "Complete!",
  error: "Failed",
};

const TestCaseGenerationModal = ({ open, onOpenChange, onComplete }: TestCaseGenerationModalProps) => {
  const { projectId, projectSettings } = useWizard();
  const [model, setModel] = useState(projectSettings.ai_model);
  const [moduleName, setModuleName] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [requirementCount, setRequirementCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [startingGeneration, setStartingGeneration] = useState(false);

  const [docSummary, setDocSummary] = useState({ brd: 0, fsd: 0, tdd: 0, api_spec: 0, figma: 0, code: 0 });
  const [selectedSources, setSelectedSources] = useState({ documents: true, figma: true, code: true });
  const [selectedLevels, setSelectedLevels] = useState({ system: true, integration: true, uat: true });

  useEffect(() => { setModel(projectSettings.ai_model); }, [projectSettings.ai_model]);

  useEffect(() => {
    if (!open || !projectId) return;
    const fetchContext = async () => {
      try {
        const status = await apiClient.get<any>(`/projects/${projectId}/status`);
        setRequirementCount(status.total_requirements || 0);
        setDocSummary({
          brd: status.doc_count || 0,
          fsd: 0, tdd: 0, api_spec: 0,
          figma: status.has_figma ? 1 : 0,
          code: status.code_chunk_count || 0,
        });
        setSelectedSources({
          documents: (status.doc_count || 0) > 0,
          figma: status.has_figma,
          code: status.has_code,
        });
      } catch (err) {
        console.error("Failed to fetch context", err);
      }
    };
    fetchContext();
  }, [open, projectId]);

  const handleJobComplete = useCallback((_completedJob: GenerationJob) => {
    setCurrentJobId(null);
    setError(null);
    onComplete?.();
  }, [onComplete]);

  const handleJobError = useCallback((failedJob: GenerationJob) => {
    setError(failedJob.error_message || "Generation failed");
    setCurrentJobId(null);
  }, []);

  const { job, polling: generating } = useGenerationJobPoller({
    projectId,
    jobId: currentJobId,
    onComplete: handleJobComplete,
    onError: handleJobError,
  });

  const isBusy = generating || startingGeneration;

  const getSelectedSourcesArray = () => {
    const sources: string[] = [];
    if (selectedSources.documents) sources.push("documents");
    if (selectedSources.figma) sources.push("figma");
    if (selectedSources.code) sources.push("code");
    return sources;
  };

  const getSelectedLevelsArray = () => {
    const levels: string[] = [];
    if (selectedLevels.system) levels.push("system");
    if (selectedLevels.integration) levels.push("integration");
    if (selectedLevels.uat) levels.push("uat");
    return levels;
  };

  const anySourceSelected = selectedSources.documents || selectedSources.figma || selectedSources.code;
  const anyLevelSelected = selectedLevels.system || selectedLevels.integration || selectedLevels.uat;

  const handleGenerate = async () => {
    if (!anySourceSelected || !anyLevelSelected || requirementCount === 0 || !projectId) {
      toast.error("Select sources & levels, and ensure requirements exist.");
      return;
    }

    setStartingGeneration(true);
    setError(null);

    try {
      const response = await apiClient.post<any>("/pipelines/test-cases", {
        project_id: projectId,
        ai_model: model,
        test_levels: getSelectedLevelsArray().map(l => l.charAt(0).toUpperCase() + l.slice(1)),
        sources: getSelectedSourcesArray(),
        module_name: moduleName || undefined,
        feature_description: featureDescription || undefined,
        // pass_name tidak diset = jalankan full pipeline (generate + review + negative + e2e + coverage)
      });

      // Start polling — backend runs in background
      setCurrentJobId(response.jobId || "polling");
      toast.info(`Started 5-pass pipeline for ${requirementCount} requirements`);
    } catch (err: any) {
      setError(err.message || "Failed to start generation");
      toast.error(err.message || "Failed to start generation");
    } finally {
      setStartingGeneration(false);
    }
  };

  const progressLabel = job ? (PHASE_LABELS[job.phase] || job.phase) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Test Cases (5-Pass Pipeline)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">AI Model</span>
            <ModelPicker value={model} onChange={setModel} disabled={isBusy} compact />
          </div>

          {/* Source Selection */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sources</h3>
            <div className="flex gap-3 flex-wrap">
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${selectedSources.documents ? "border-primary bg-primary/5" : "border-border"}`}>
                <Checkbox checked={selectedSources.documents} onCheckedChange={(v) => setSelectedSources(prev => ({ ...prev, documents: !!v }))} disabled={isBusy} />
                <FileText className="w-3.5 h-3.5 text-primary" /> Documents ({docSummary.brd + docSummary.fsd + docSummary.tdd + docSummary.api_spec})
              </label>
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${selectedSources.figma ? "border-primary bg-primary/5" : "border-border"} ${docSummary.figma === 0 ? "opacity-50" : ""}`}>
                <Checkbox checked={selectedSources.figma} onCheckedChange={(v) => setSelectedSources(prev => ({ ...prev, figma: !!v }))} disabled={isBusy || docSummary.figma === 0} />
                <Figma className="w-3.5 h-3.5 text-primary" /> Figma ({docSummary.figma})
              </label>
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${selectedSources.code ? "border-primary bg-primary/5" : "border-border"} ${docSummary.code === 0 ? "opacity-50" : ""}`}>
                <Checkbox checked={selectedSources.code} onCheckedChange={(v) => setSelectedSources(prev => ({ ...prev, code: !!v }))} disabled={isBusy || docSummary.code === 0} />
                <FolderCode className="w-3.5 h-3.5 text-primary" /> Code ({docSummary.code})
              </label>
            </div>
          </div>

          {/* Level Selection */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Test Levels</h3>
            <div className="flex gap-3 flex-wrap">
              {([
                { key: "system" as const, label: "System" },
                { key: "integration" as const, label: "Integration" },
                { key: "uat" as const, label: "UAT" },
              ]).map(level => (
                <label key={level.key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${selectedLevels[level.key] ? "border-primary bg-primary/5" : "border-border"}`}>
                  <Checkbox checked={selectedLevels[level.key]} onCheckedChange={(v) => setSelectedLevels(prev => ({ ...prev, [level.key]: !!v }))} disabled={isBusy} />
                  {level.label}
                </label>
              ))}
            </div>
          </div>

          {/* Optional config */}
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Module Name (optional)</Label>
              <Input value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder="e.g. User Authentication" className="mt-1 h-8 text-xs" disabled={isBusy} />
            </div>
            <div>
              <Label className="text-xs">Feature Description (optional)</Label>
              <Textarea value={featureDescription} onChange={(e) => setFeatureDescription(e.target.value)} placeholder="Focus area..." rows={2} className="mt-1 text-xs" disabled={isBusy} />
            </div>
          </div>

          {/* Progress */}
          {generating && job && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">{progressLabel}</span>
                <span className="font-mono text-primary font-semibold">{job.percentage}%</span>
              </div>
              <Progress value={job.percentage} className="h-2" />
              <div className="text-[10px] text-muted-foreground">
                {job.scripts_generated > 0 && <span className="font-semibold text-primary">{job.scripts_generated}</span>}
                {job.scripts_generated > 0 && " test cases generated so far"}
              </div>
              <p className="text-[10px] text-muted-foreground italic">💡 You can close this — generation continues in background.</p>
            </div>
          )}

          {job && job.status === "completed" && !generating && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">{job.scripts_generated} test cases generated</span>
            </div>
          )}

          {error && !generating && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-xs">
              <div className="flex items-center gap-2 text-destructive font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Generation failed
              </div>
              <p className="text-destructive/80 mt-1">{error}</p>
            </div>
          )}

          <Button onClick={handleGenerate} disabled={isBusy || !anySourceSelected || !anyLevelSelected || requirementCount === 0} className="w-full gap-2">
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isBusy ? "Running Pipeline..." : `Generate Test Cases (${requirementCount} reqs)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestCaseGenerationModal;
