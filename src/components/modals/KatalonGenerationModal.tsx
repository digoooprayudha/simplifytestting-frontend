import { useState, useEffect, useCallback } from "react";
import { FileCode, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { useWizard } from "@/lib/wizardContext";
import { useGenerationJobPoller, GenerationJob } from "@/hooks/useGenerationJobPoller";
import { loadKatalonFromDb } from "@/lib/wizardContext";
import ModelPicker from "@/components/ModelPicker";

const BROWSER_OPTIONS = ["Chrome", "Firefox", "Edge", "Safari"] as const;
const NAMING_OPTIONS = ["camelCase", "snake_case", "PascalCase", "kebab-case"] as const;
const LOCATOR_OPTIONS = ["id > css > xpath", "css > id > xpath", "xpath > css > id", "id > xpath > css"] as const;

interface KatalonGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const KatalonGenerationModal = ({ open, onOpenChange, onComplete }: KatalonGenerationModalProps) => {
  const { projectId, projectSettings, setProjectSettings, setKatalon } = useWizard();
  const [model, setModel] = useState(projectSettings.ai_model);
  const [browsers, setBrowsers] = useState<string[]>([projectSettings.browser_type]);
  const [naming, setNaming] = useState(projectSettings.naming_convention);
  const [locator, setLocator] = useState(projectSettings.locator_strategy);
  const [baseUrl, setBaseUrl] = useState(projectSettings.base_url);
  const [error, setError] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [startingGeneration, setStartingGeneration] = useState(false);
  const [existingScriptsCount, setExistingScriptsCount] = useState(0);

  useEffect(() => {
    setModel(projectSettings.ai_model);
    setBrowsers([projectSettings.browser_type]);
    setNaming(projectSettings.naming_convention);
    setLocator(projectSettings.locator_strategy);
    setBaseUrl(projectSettings.base_url);
  }, [projectSettings]);

  useEffect(() => {
    if (!open || !projectId) return;
    apiClient.get<{ scripts: any[] }>(`/projects/${projectId}/katalon`)
      .then(data => setExistingScriptsCount(data.scripts?.length || 0))
      .catch(() => setExistingScriptsCount(0));
  }, [open, projectId]);

  const handleJobComplete = useCallback(async (completedJob: GenerationJob) => {
    if (!projectId) return;
    const katalonData = await loadKatalonFromDb(projectId);
    if (katalonData) setKatalon(katalonData);
    setCurrentJobId(null);
    setError(null);
    onComplete?.();
  }, [projectId, setKatalon, onComplete]);

  const handleJobError = useCallback((failedJob: GenerationJob) => {
    const isCancelled = failedJob.error_message?.toLowerCase().includes("cancel") || failedJob.phase === "cancelled";
    if (!isCancelled) {
      setError(failedJob.error_message || "Generation failed");
    }
    setCurrentJobId(null);
  }, []);

  const handleCancel = async () => {
    if (!currentJobId || currentJobId === "polling") return;
    try {
      await apiClient.post(`/pipelines/cancel/${currentJobId}`, {});
      toast.info("Cancellation requested. Stopping after current batch...");
    } catch (e) {
      toast.error("Failed to cancel");
    }
  };

  const { job, polling: generating } = useGenerationJobPoller({
    projectId,
    jobId: currentJobId,
    onComplete: handleJobComplete,
    onError: handleJobError,
  });

  const isBusy = generating || startingGeneration;

  const toggleBrowser = (browser: string) => {
    setBrowsers(prev => prev.includes(browser) ? prev.filter(b => b !== browser) : [...prev, browser]);
  };

  const handleGenerate = async (missingOnly = false) => {
    if (isBusy || !projectId) return;
    if (browsers.length === 0) { toast.error("Select at least one browser"); return; }

    setStartingGeneration(true);
    try {
      // Save config via FastAPI
      const updates = {
        browser_type: browsers[0] || "Chrome",
        naming_convention: naming,
        locator_strategy: locator,
        base_url: baseUrl,
      };
      await apiClient.patch(`/projects/${projectId}/settings`, updates);
      setProjectSettings({ ...projectSettings, ...updates } as any);

      setError(null);
      if (!missingOnly) { setKatalon(null); setExistingScriptsCount(0); }

      const response = await apiClient.post<{
        jobId?: string;
        allCovered?: boolean;
        error?: string;
        totalTestCases?: number;
        totalBatches?: number;
      }>("/pipelines/automation", {
        project_id: projectId,
        missing_only: missingOnly,
        ai_model: model,
        target_browsers: browsers,
        locator_strategy: locator,
        naming_convention: naming,
        base_url: baseUrl,
      });

      if (response.allCovered) {
        toast.success("All test cases already have Katalon scripts — 100% coverage! 🎉");
        setStartingGeneration(false);
        setCurrentJobId(null);
        return;
      }
      if (response.error) throw new Error(response.error);

      setCurrentJobId(response.jobId || "polling");
      toast.info(`Started generation: ${response.totalTestCases ?? "?"} test cases in ${response.totalBatches ?? "?"} batches`);
    } catch (err: any) {
      setError(err.message || "Failed to start generation");
      toast.error(err.message || "Failed to start generation");
    } finally {
      setStartingGeneration(false);
    }
  };

  const progressLabel = job
    ? job.phase === "starting" ? "Initializing..."
    : job.phase === "complete" ? "Complete!"
    : job.phase === "saving" ? "Finalizing..."
    : `Batch ${job.completed_batches + job.failed_batches}/${job.total_batches} • ${job.scripts_generated} scripts`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-primary" />
            Generate Katalon Scripts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">AI Model</span>
            <ModelPicker value={model} onChange={setModel} disabled={isBusy} compact />
          </div>

          {/* Browser Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Browser(s)</Label>
            <div className="flex flex-wrap gap-3">
              {BROWSER_OPTIONS.map((b) => (
                <label key={b} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={browsers.includes(b)} onCheckedChange={() => toggleBrowser(b)} disabled={isBusy} />
                  <span className="text-xs">{b}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Locator Strategy</Label>
              <Select value={locator} onValueChange={setLocator} disabled={isBusy}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATOR_OPTIONS.map((opt) => <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Naming Convention</Label>
              <Select value={naming} onValueChange={(v) => setNaming(v as any)} disabled={isBusy}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NAMING_OPTIONS.map((opt) => <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Base URL</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-app.com" className="h-8 text-xs" disabled={isBusy} />
          </div>

          {existingScriptsCount > 0 && !generating && (
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span><span className="font-semibold text-primary">{existingScriptsCount}</span> scripts exist. Regenerating replaces them.</span>
            </div>
          )}

          {generating && job && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">{progressLabel}</span>
                <span className="font-mono text-primary font-semibold">{job.percentage}%</span>
              </div>
              <Progress value={job.percentage} className="h-2" />
              <p className="text-[10px] text-muted-foreground italic">💡 You can close this — generation continues in background.</p>
              <Button variant="outline" size="sm" onClick={handleCancel} className="w-full gap-2 text-xs h-7 border-destructive/50 text-destructive hover:bg-destructive/10">
                Stop Generation
              </Button>
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

          <Button onClick={() => handleGenerate(false)} disabled={isBusy || browsers.length === 0} className="w-full gap-2">
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
            {isBusy ? "Generating..." : existingScriptsCount > 0 ? "Regenerate All Scripts" : "Generate Automation Code"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KatalonGenerationModal;
