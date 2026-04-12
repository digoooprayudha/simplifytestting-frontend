import ValidationModal from "@/components/modals/ValidationModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GenerationJob, useGenerationJobPoller } from "@/hooks/useGenerationJobPoller";
import { apiClient } from "@/lib/apiClient";
import { loadKatalonFromDb, useWizard } from "@/lib/wizardContext";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Database, FileCode, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const BROWSER_OPTIONS = ["Chrome", "Firefox", "Edge", "Safari"] as const;
const NAMING_OPTIONS = ["camelCase", "snake_case", "PascalCase", "kebab-case"] as const;
const LOCATOR_OPTIONS = [
  "id > css > xpath",
  "css > id > xpath",
  "xpath > css > id",
  "id > xpath > css",
] as const;

const Step5GenerateKatalon = () => {
  const { setCurrentStep, katalon, setKatalon, projectSettings, setProjectSettings, projectId, refreshProgress } = useWizard();
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [existingScriptsCount, setExistingScriptsCount] = useState(0);
  const [totalAutomatable, setTotalAutomatable] = useState(0);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [startingGeneration, setStartingGeneration] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [testCaseJobRunning, setTestCaseJobRunning] = useState(false);
  const [pendingTCs, setPendingTCs] = useState(0);

  // Local config state
  const [browsers, setBrowsers] = useState<string[]>([projectSettings.browser_type]);
  const [naming, setNaming] = useState(projectSettings.naming_convention);
  const [locator, setLocator] = useState(projectSettings.locator_strategy);
  const [baseUrl, setBaseUrl] = useState(projectSettings.base_url);

  const pid = projectId || urlProjectId;

  // Check for any recent running job on mount
  useEffect(() => {
    if (!pid) return;
    const checkRunning = async () => {
      try {
        const latestJob = await apiClient.get<any>(`/projects/${pid}/jobs/latest`);
        if (latestJob && latestJob.status === "running") {
          if (latestJob.job_type === "katalon") {
            setCurrentJobId(latestJob.id);
          } else if (latestJob.job_type === "test_cases" || latestJob.job_type === "test_cases_pipeline") {
            setTestCaseJobRunning(true);
          }
        }
      } catch (err) {
        console.error("Failed to check running jobs", err);
      }
    };
    checkRunning();
  }, [pid]);

  const handleJobComplete = useCallback(async (completedJob: GenerationJob) => {
    if (!pid) return;
    const katalonData = await loadKatalonFromDb(pid);
    let currentScriptsCount = existingScriptsCount;
    if (katalonData) {
      setKatalon(katalonData);
      currentScriptsCount = katalonData.scripts.length;
      setExistingScriptsCount(currentScriptsCount);
    }
    setRetryCount(0);
    setError(null);
    setCurrentJobId(null);

    // Auto-Retry Logic
    if (currentScriptsCount > 0 && currentScriptsCount < totalAutomatable) {
      toast.info(`Generated ${currentScriptsCount}/${totalAutomatable} scripts. Auto-retrying missing ones...`);
      setTimeout(async () => {
        try {
          const response = await apiClient.post<{ jobId?: string }>("/pipelines/automation", {
            project_id: pid,
            missing_only: true,
          });
          if (response.jobId) setCurrentJobId(response.jobId);
        } catch (err) {
          toast.error("Auto-retry failed to start.");
        }
      }, 1000);
    } else {
      toast.success(`Katalon generation complete! ${completedJob.scripts_generated} scripts generated.`);
      if (currentScriptsCount > 0 && currentScriptsCount >= totalAutomatable) {
        setCurrentStep(6);
      }
      await refreshProgress();
    }
  }, [pid, setKatalon, existingScriptsCount, totalAutomatable, setCurrentStep, refreshProgress]);

  const handleJobError = useCallback((failedJob: GenerationJob) => {
    setError(failedJob.error_message || "Generation failed");
    setRetryCount(prev => prev + 1);
    setCurrentJobId(null);
  }, []);

  const { job, polling: generating } = useGenerationJobPoller({
    projectId: pid,
    jobId: currentJobId,
    onComplete: handleJobComplete,
    onError: handleJobError,
  });

  const isBusy = generating || startingGeneration;

  useEffect(() => {
    setBrowsers([projectSettings.browser_type]);
    setNaming(projectSettings.naming_convention);
    setLocator(projectSettings.locator_strategy);
    setBaseUrl(projectSettings.base_url);
  }, [projectSettings]);

  const toggleBrowser = (browser: string) => {
    setBrowsers(prev =>
      prev.includes(browser) ? prev.filter(b => b !== browser) : [...prev, browser]
    );
  };

  // Save config changes via FastAPI
  const saveConfig = useCallback(async () => {
    if (!pid) return;
    const updates = {
      browser_type: browsers[0] || "Chrome",
      naming_convention: naming,
      locator_strategy: locator,
      base_url: baseUrl,
      ai_model: projectSettings.ai_model,
    };
    await apiClient.patch(`/projects/${pid}/settings`, updates);
    setProjectSettings({ ...projectSettings, ...updates } as any);
  }, [pid, browsers, naming, locator, baseUrl, projectSettings, setProjectSettings]);

  // Load existing scripts count and total automatable via FastAPI
  useEffect(() => {
    const loadCount = async () => {
      if (!pid) return;
      try {
        const [katalonData, tcData] = await Promise.all([
          apiClient.get<{ scripts: any[] }>(`/projects/${pid}/katalon`).catch(() => ({ scripts: [] })),
          apiClient.get<{ test_cases: any[] }>(`/projects/${pid}/test-cases`).catch(() => ({ test_cases: [] })),
        ]);
        const scripts = katalonData.scripts || [];
        const allTcs = tcData.test_cases || [];
        const automatable = allTcs.filter((tc: any) => tc.automation_eligible && tc.status === "approved");
        const pending = allTcs.filter((tc: any) => tc.automation_eligible && tc.status !== "approved");
        setExistingScriptsCount(scripts.length);
        setTotalAutomatable(automatable.length);
        setPendingTCs(pending.length);
      } catch (err) {
        console.error("Failed to load script counts", err);
      }
    };
    loadCount();
  }, [pid, katalon]);

  const handleGenerate = useCallback(async (missingOnly = false) => {
    if (isBusy) return;

    if (browsers.length === 0) {
      toast.error("Select at least one browser");
      return;
    }

    setStartingGeneration(true);

    try {
      await saveConfig();
      setError(null);
      if (!missingOnly) {
        setKatalon(null);
        setExistingScriptsCount(0);
      }

      const response = await apiClient.post<{
        jobId?: string;
        allCovered?: boolean;
        error?: string;
        totalTestCases?: number;
        totalBatches?: number;
        alreadyRunning?: boolean;
      }>("/pipelines/automation", {
        project_id: pid,
        missing_only: missingOnly,
        ai_model: projectSettings.ai_model,
        target_browsers: browsers,
        locator_strategy: locator,
        naming_convention: naming,
        base_url: baseUrl,
      });

      if (response.allCovered) {
        toast.success("All test cases already have Katalon scripts — 100% coverage! 🎉");
        setStartingGeneration(false);
        return;
      }
      if (response.error) throw new Error(response.error);

      // Backend runs in background — start polling latest job
      setCurrentJobId(response.jobId || "polling");
      if (response.alreadyRunning) {
        toast.info("Generation is already running. Re-attached to current job.");
      } else {
        toast.info(
          `Started generation: ${response.totalTestCases ?? "?"} test cases in ${response.totalBatches ?? "?"} batches${missingOnly ? " (missing only)" : ""}`
        );
      }
    } catch (err: any) {
      console.error("Katalon generation error:", err);
      const msg = err.message || "Failed to start generation";
      setError(msg);
      setRetryCount(prev => prev + 1);
      toast.error(msg);
    } finally {
      setStartingGeneration(false);
    }
  }, [pid, browsers, locator, naming, baseUrl, saveConfig, setKatalon, isBusy]);

  const progressLabel = job
    ? job.phase === "starting"
      ? "Initializing..."
      : job.phase === "saving" || job.phase === "complete"
      ? job.phase === "complete" ? "Complete!" : "Finalizing..."
      : `Batch ${job.completed_batches + job.failed_batches}/${Math.max(job.total_batches, job.completed_batches + job.failed_batches, 1)} • ${job.scripts_generated} scripts generated`
    : "";

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <FileCode className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Katalon Code Generation</h1>
            <p className="text-sm text-muted-foreground">Generate automation scripts from test cases</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mt-8 p-6 rounded-xl bg-card border border-border space-y-4"
      >
        <h3 className="text-sm font-semibold text-foreground">Generation Configuration</h3>

        {/* Browser Selection */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Target Browser(s)</Label>
          <div className="flex flex-wrap gap-3">
            {BROWSER_OPTIONS.map((b) => (
              <label key={b} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={browsers.includes(b)}
                  onCheckedChange={() => toggleBrowser(b)}
                  disabled={isBusy}
                />
                <span className="text-xs text-foreground">{b}</span>
              </label>
            ))}
          </div>
          {browsers.length === 0 && (
            <p className="text-[10px] text-destructive">Select at least one browser</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Locator Strategy</Label>
            <Select value={locator} onValueChange={setLocator} disabled={isBusy}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOCATOR_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Naming Convention</Label>
            <Select value={naming} onValueChange={(v) => setNaming(v as any)} disabled={isBusy}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NAMING_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Base URL</Label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-app.com" className="h-9 text-xs" disabled={isBusy} />
        </div>

        <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Generation produces:</p>
          <p>• Groovy test scripts per test case {browsers.length > 1 ? `(${browsers.length} browser configs)` : ""}</p>
          <p>• Object Repository entries with locators ({locator})</p>
          <p>• Test Suite configuration</p>
          <p>• Reusable CustomKeywords for common flows</p>
          <p className="mt-1 text-primary font-medium flex items-center gap-1">
            <Database className="w-3 h-3" /> All scripts are persisted with full traceability to test cases & requirements
          </p>
        </div>

        {existingScriptsCount > 0 && !generating && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="text-foreground">
              <span className="font-semibold text-primary">{existingScriptsCount}</span> scripts already saved in database.
              Regenerating will replace them.
            </span>
          </div>
        )}

        {/* Progress bar */}
        {generating && job && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">{progressLabel}</span>
              <span className="font-mono text-primary font-semibold">{job.percentage}%</span>
            </div>
            <Progress value={job.percentage} className="h-2" />
            {job.credits_exhausted && (
              <p className="text-xs text-destructive">⚠ Credits exhausted — returning partial results...</p>
            )}
            {job.failed_batches > 0 && !job.credits_exhausted && (
              <p className="text-xs text-warning">⚠ {job.failed_batches} batch(es) failed, continuing...</p>
            )}
            <p className="text-[10px] text-muted-foreground italic">
              💡 You can navigate away — generation continues in the background. You'll be notified when it's done.
            </p>
          </div>
        )}

        {/* Background test case generation indicator */}
        {testCaseJobRunning && !generating && (
          <div className="p-3 rounded-lg bg-info/10 border border-info/30 text-xs flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-info animate-spin shrink-0" />
            <div className="flex-1">
              <p className="text-foreground font-medium">New test cases are being generated...</p>
              <p className="text-muted-foreground">The coverage count will update as new test cases are approved.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/project/${pid}/test-cases`)} className="h-7 text-[10px] border-info/30 text-info">View Progress</Button>
          </div>
        )}

        {/* Pending Approval indicator */}
        {pendingTCs > 0 && !testCaseJobRunning && !generating && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs flex items-center gap-3">
            <Clock className="w-4 h-4 text-warning shrink-0" />
            <div className="flex-1">
              <p className="text-foreground font-medium">{pendingTCs} test cases pending approval</p>
              <p className="text-muted-foreground">Scripts can only be generated for approved test cases.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/project/${pid}/test-cases`)} className="h-7 text-[10px] border-warning/30 text-warning">Approve Now</Button>
          </div>
        )}

        {/* Error display */}
        {error && !generating && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium">
              <AlertTriangle className="w-4 h-4" />
              <span>Generation failed</span>
            </div>
            <p className="text-destructive/80">{error}</p>
            {retryCount > 0 && (
              <p className="text-muted-foreground">Attempt {retryCount} failed. Click retry to try again.</p>
            )}
          </div>
        )}

        {/* Generate Missing button */}
        {existingScriptsCount > 0 && existingScriptsCount < totalAutomatable && !generating && (
          <Button onClick={() => handleGenerate(true)} disabled={isBusy} variant="outline" className="w-full gap-2 mb-2 border-primary/30 text-primary hover:bg-primary/10">
            <RefreshCw className="w-4 h-4" />
            Generate Missing Scripts Only ({totalAutomatable - existingScriptsCount} remaining)
          </Button>
        )}

        <div className="flex gap-2">
          {existingScriptsCount > 0 && !generating && (
            <Button onClick={() => setValidationOpen(true)} variant="outline" className="flex-1 gap-2">
              <Sparkles className="w-4 h-4" /> Validate Scripts
            </Button>
          )}
          <Button onClick={() => handleGenerate(false)} disabled={isBusy} className="flex-1 gap-2">
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : error ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <FileCode className="w-4 h-4" />
            )}
            {isBusy
              ? generating
                ? "Generating Automation Code..."
                : "Starting Generation..."
              : error
              ? "Retry Generation"
              : katalon
              ? "Regenerate All Scripts"
              : "Generate Automation Code"}
          </Button>
        </div>
      </motion.div>

      {pid && (
        <ValidationModal
          open={validationOpen}
          onOpenChange={setValidationOpen}
          artifactType="katalon_scripts"
          projectId={pid}
          onAccepted={async () => {
            if (!pid) return;
            const katalonData = await loadKatalonFromDb(pid);
            if (katalonData) {
              setKatalon(katalonData);
              setExistingScriptsCount(katalonData.scripts.length);
            }
          }}
        />
      )}

      {katalon && !generating && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/30"
        >
          <div className="flex items-center gap-2 justify-center">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-primary">
              {katalon.scripts?.length ?? 0} scripts, {katalon.page_objects?.length ?? 0} page objects, 1 test suite
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            ✅ Saved to database with full traceability — proceed to review
          </p>
        </motion.div>
      )}

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => navigate(`/project/${urlProjectId}/test-cases`)}>← Back</Button>
        <Button onClick={() => { setCurrentStep(6); navigate(`/project/${urlProjectId}/automation`); }} disabled={!katalon} className="gap-2">
          Review Automation <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default Step5GenerateKatalon;
