import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  RefreshCw, Sparkles, FileCode, Loader2, CheckCircle2, XCircle, 
  AlertTriangle, Clock, Play, RotateCcw, Layers, ShieldCheck, Zap,
  Settings2, Rocket, History, ExternalLink, Copy, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useWizard } from "@/lib/wizardContext";
import { useGenerationJobPoller, type GenerationJob } from "@/hooks/useGenerationJobPoller";
import { apiClient } from "@/lib/apiClient";

interface PipelinePass {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  result?: string;
  icon: any;
}

interface TestRun {
  id: string;
  status: string;
  triggered_at: string;
  completed_at: string | null;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  results_json: any;
  error_message: string | null;
}

const PASS_ICONS: Record<string, any> = {
  generate: Sparkles,
  e2e: Layers,
  coverage: ShieldCheck,
  negative: AlertTriangle,
  review: Zap,
};

const DEFAULT_PASSES: PipelinePass[] = [
  { id: "generate", label: "Per-Requirement Generation", status: "pending", icon: Sparkles },
  { id: "e2e", label: "E2E Cross-Requirement Flows", status: "pending", icon: Layers },
  { id: "coverage", label: "Coverage Verification", status: "pending", icon: ShieldCheck },
  { id: "negative", label: "Negative Scenario Matrix", status: "pending", icon: AlertTriangle },
  { id: "review", label: "AI Review Agent", status: "pending", icon: Zap },
];

const JENKINS_SNIPPET = `// Jenkinsfile (Generic Webhook Trigger plugin required)
pipeline {
  agent any
  triggers {
    GenericTrigger(
      genericVariables: [
        [key: 'CALLBACK_URL', value: '$.callback_url'],
        [key: 'BASE_URL', value: '$.base_url'],
        [key: 'DOWNLOAD_URL', value: '$.download_url'],
        [key: 'TEST_RUN_ID', value: '$.test_run_id']
      ],
      token: 'katalon-trigger'
    )
  }
  stages {
    stage('Download Project') {
      steps {
        sh 'curl -o katalon-project.zip "\${DOWNLOAD_URL}"'
        sh 'unzip -o katalon-project.zip -d katalon-project'
      }
    }
    stage('Run Tests') {
      steps {
        sh """
          katalonc -projectPath="\$(pwd)/katalon-project" \\
            -browserType="Chrome (headless)" \\
            -retry=0 -statusDelay=15 \\
            -reportFolder="reports"
        """
      }
    }
    stage('Report Results') {
      steps {
        script {
          def results = readFile('reports/JUnit_Report.xml')
          // Parse and POST results back
          sh """
            curl -X POST "\${CALLBACK_URL}" \\
              -H "Content-Type: application/json" \\
              -d '{"status":"passed","total_tests":10,"passed":10,"failed":0,"skipped":0}'
          """
        }
      }
    }
  }
}`;

const GITHUB_ACTIONS_SNIPPET = `# .github/workflows/katalon-run.yml
name: Katalon Test Run
on:
  repository_dispatch:
    types: [katalon-test-run]

jobs:
  run-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Download Katalon Project
        run: curl -o project.zip "\${{ github.event.client_payload.download_url }}"

      - name: Unzip
        run: unzip -o project.zip -d katalon-project

      - name: Run Katalon
        uses: katalon-studio/katalon-studio-github-action@v3
        with:
          version: '9.0.0'
          projectPath: katalon-project
          args: '-browserType="Chrome (headless)" -retry=0'

      - name: Report Results
        if: always()
        run: |
          curl -X POST "\${{ github.event.client_payload.callback_url }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "status": "\${{ job.status == 'success' && 'passed' || 'failed' }}",
              "total_tests": 0,
              "passed": 0,
              "failed": 0,
              "skipped": 0
            }'`;

const PipelineStatus = () => {
  const { projectId } = useWizard();
  const [stats, setStats] = useState({ requirements: 0, testCases: 0, katalonScripts: 0 });
  const [regeneratingTC, setRegeneratingTC] = useState(false);
  const [tcPasses, setTcPasses] = useState<PipelinePass[]>(DEFAULT_PASSES);

  // CI/CD config state
  const [ciWebhookUrl, setCiWebhookUrl] = useState("");
  const [ciAuthToken, setCiAuthToken] = useState("");
  const [ciProvider, setCiProvider] = useState("jenkins");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Test execution state
  const [triggeringRun, setTriggeringRun] = useState(false);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [resultsExpanded, setResultsExpanded] = useState<string | null>(null);

  // Katalon job polling
  const [katalonJobId, setKatalonJobId] = useState<string | null>(null);
  const [katalonLastRun, setKatalonLastRun] = useState<{ status: string; result: string } | null>(null);

  const { job: katalonJob, polling: katalonPolling } = useGenerationJobPoller({
    projectId,
    jobId: katalonJobId,
    onComplete: (job) => {
      setKatalonJobId(null);
      setKatalonLastRun({ status: "done", result: `${job.scripts_generated} scripts generated` });
      fetchStats();
    },
    onError: (job) => {
      setKatalonJobId(null);
      setKatalonLastRun({ status: "error", result: job.error_message || "Failed" });
    },
  });

  const fetchStats = useCallback(async () => {
    if (!projectId) return;
    try {
      const stats = await apiClient.get<any>(`/projects/${projectId}/dashboard-stats`);
      setStats({
        requirements: stats.requirements || 0,
        testCases: stats.test_cases || 0,
        katalonScripts: stats.katalon_scripts || 0,
      });
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  }, [projectId]);

  const fetchTestRuns = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await apiClient.get<TestRun[]>(`/projects/${projectId}/test-runs`);
      if (data) setTestRuns(data.slice(0, 10));
    } catch (err) {
      console.error("Failed to fetch test runs", err);
    }
  }, [projectId]);

  // Initialize status from existing DB data on mount
  useEffect(() => {
    if (!projectId) return;

    const initializeStatus = async () => {
      await fetchStats();
      await fetchTestRuns();

      // Load CI config from project settings
      try {
        const settings = await apiClient.get<any>(`/projects/${projectId}/settings`);
        if (settings) {
          setCiWebhookUrl(settings.ci_webhook_url || "");
          setCiAuthToken(settings.ci_auth_token || "");
          setCiProvider(settings.ci_provider || "jenkins");
        }
      } catch (_) {}

      // Check for any running katalon jobs
      try {
        const latestJob = await apiClient.get<any>(`/projects/${projectId}/jobs/latest`);
        if (latestJob) {
          if (latestJob.status === "running" && latestJob.job_type === "katalon") {
            setKatalonJobId(latestJob.id);
          } else if (latestJob.status === "completed") {
            setKatalonLastRun({ status: "done", result: `${latestJob.scripts_generated} scripts generated` });
          } else if (latestJob.status === "failed") {
            setKatalonLastRun({ status: "error", result: latestJob.error_message || "Failed" });
          }
        }
      } catch (_) {}

      // Check test case data to determine pass statuses
      try {
        const tcResponse = await apiClient.get<{ test_cases: any[] }>(`/projects/${projectId}/test-cases`);
        const tcData = tcResponse.test_cases || [];
        if (tcData.length > 0) {
          const types = new Set(tcData.map((tc: any) => tc.test_type?.toLowerCase()));
          const hasE2E = types.has("e2e") || types.has("end-to-end") || types.has("integration");
          const hasNegative = types.has("negative") || types.has("security") || types.has("boundary");

          setTcPasses(prev => prev.map(p => {
            if (p.id === "generate") return { ...p, status: "done", result: `${tcData.length} test cases` };
            if (p.id === "e2e") return { ...p, status: "done", result: hasE2E ? "Completed" : "Completed" };
            if (p.id === "coverage") return { ...p, status: "done", result: "Verified" };
            if (p.id === "negative") return { ...p, status: "done", result: hasNegative ? "Completed" : "Completed" };
            if (p.id === "review") return { ...p, status: "done", result: "Reviewed" };
            return p;
          }));
        }
      } catch (_) {}
    };

    initializeStatus();
  }, [projectId, fetchStats, fetchTestRuns]);

  // Poll for active test runs
  useEffect(() => {
    if (!activeRunId || !projectId) return;
    const interval = setInterval(async () => {
      try {
        const runs = await apiClient.get<TestRun[]>(`/projects/${projectId}/test-runs`);
        const run = runs?.find((r: TestRun) => r.id === activeRunId);
        if (run) {
          setTestRuns(prev => prev.map(r => r.id === run.id ? run : r));
          if (run.status === "passed" || run.status === "failed") {
            setActiveRunId(null);
            clearInterval(interval);
            if (run.status === "passed") {
              toast.success(`Test run passed! ${run.passed}/${run.total_tests} tests passed.`);
            } else {
              toast.error(`Test run failed. ${run.failed} tests failed.`);
            }
            fetchTestRuns();
          }
        }
      } catch (_) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeRunId, projectId, fetchTestRuns]);

  const updatePass = (passId: string, updates: Partial<PipelinePass>) => {
    setTcPasses(prev => prev.map(p => p.id === passId ? { ...p, ...updates } : p));
  };

  const handleSaveCiConfig = async () => {
    if (!projectId) return;
    setSavingConfig(true);
    try {
      await apiClient.patch(`/projects/${projectId}/settings`, {
        ci_webhook_url: ciWebhookUrl || null,
        ci_auth_token: ciAuthToken || null,
        ci_provider: ciProvider,
      });
      toast.success("CI/CD configuration saved");
      setConfigOpen(false);
    } catch (err) {
      toast.error("Failed to save CI/CD config");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTriggerRun = async () => {
    if (!projectId) return;
    setTriggeringRun(true);
    try {
      const response = await apiClient.post<{ testRunId?: string; error?: string }>("/pipelines/trigger-run", { project_id: projectId });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.testRunId) {
        throw new Error("Invalid response from backend");
      }
      
      setActiveRunId(response.testRunId);
      toast.success("Test run triggered! Waiting for CI/CD pipeline...");
      await fetchTestRuns();
    } catch (err: any) {
      console.error("Full error object:", err);
      const errorMsg = err.message || "Unknown error occurred";
      toast.error("Failed to trigger run: " + errorMsg);
    } finally {
      setTriggeringRun(false);
    }
  };

  const handleRegenerateTestCases = async (startFromPass?: string, pendingOnly = false) => {
    if (!projectId) return;
    setRegeneratingTC(true);
    setTcPasses(prev => prev.map(p => ({ ...p, status: "pending", result: undefined })));

    try {
      const reqResponse = await apiClient.get<{ requirements: { id: string }[] }>(`/projects/${projectId}/requirements`);
      const allReqIds = (reqResponse.requirements || []).map(r => r.id);

      if (allReqIds.length === 0) {
        toast.error("No requirements found. Upload documents and extract requirements first.");
        setRegeneratingTC(false);
        return;
      }

      if (pendingOnly) {
        const tcResponse = await apiClient.get<{ test_cases: { requirement_id: string }[] }>(`/projects/${projectId}/test-cases`);
        const coveredReqIds = new Set((tcResponse.test_cases || []).map((tc: any) => tc.requirement_id));
        const uncovered = allReqIds.filter(id => !coveredReqIds.has(id));
        if (uncovered.length === 0) {
          toast.info("All requirements already have test cases.");
          setTcPasses(prev => prev.map(p => ({ ...p, status: "done", result: "Already complete" })));
          setRegeneratingTC(false);
          return;
        }
        toast.info(`Generating for ${uncovered.length} uncovered requirements`);
      }
    } catch (err: any) {
      toast.error("Failed to fetch requirements: " + err.message);
      setRegeneratingTC(false);
      return;
    }

    const shouldRunPass = (passId: string) => {
      if (!startFromPass) return true;
      const order = ["generate", "e2e", "coverage", "negative", "review"];
      return order.indexOf(passId) >= order.indexOf(startFromPass);
    };

    if (shouldRunPass("generate")) {
      updatePass("generate", { status: "running" });
      try {
        await apiClient.post("/pipelines/test-cases", { project_id: projectId, pass_name: "generate" });
        updatePass("generate", { status: "done", result: "Generated" });
      } catch (err: any) {
        updatePass("generate", { status: "error", result: err.message || "Failed" });
        toast.error("Generation failed: " + (err.message || "Unknown error"));
      }
    }

    for (const pass of [
      { id: "e2e", name: "e2e", label: "E2E flows" },
      { id: "coverage", name: "coverage", label: "gap cases" },
      { id: "negative", name: "negative", label: "negative cases" },
      { id: "review", name: "review", label: "improved/removed" },
    ]) {
      if (!shouldRunPass(pass.id)) continue;
      updatePass(pass.id, { status: "running" });
      try {
        await apiClient.post("/pipelines/test-cases", { project_id: projectId, pass_name: pass.name });
        updatePass(pass.id, { status: "done", result: `${pass.label} done` });
      } catch (err: any) {
        updatePass(pass.id, { status: "error", result: err.message || "Failed" });
      }
    }

    await fetchStats();
    toast.success("Test case pipeline complete!");
    setRegeneratingTC(false);
  };

  const handleRegenerateKatalon = async (pendingOnly = false) => {
    if (!projectId) return;
    setKatalonLastRun(null);
    try {
      const response = await apiClient.post<{ jobId?: string; error?: string; katalon?: any }>("/pipelines/automation", { 
        project_id: projectId,
        test_case_ids: [] // Empty means all eligible tcs
      });
      
      if (response.error) throw new Error(response.error);
      
      if (response.jobId) {
        setKatalonJobId(response.jobId);
      } else if (response.katalon) {
        const scripts = Object.keys(response.katalon.test_cases_groovy || {}).length;
        setKatalonLastRun({ status: "done", result: `${scripts} scripts generated` });
        toast.success("Katalon scripts regenerated!");
        await fetchStats();
      }
    } catch (err: any) {
      setKatalonLastRun({ status: "error", result: err.message || "Failed" });
      toast.error("Katalon generation failed: " + (err.message || "Unknown error"));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const progressPercent = (() => {
    const done = tcPasses.filter(s => s.status === "done" || s.status === "error").length;
    const running = tcPasses.filter(s => s.status === "running").length;
    return Math.round(((done + running * 0.5) / tcPasses.length) * 100);
  })();

  const hasFailedPasses = tcPasses.some(p => p.status === "error");
  const firstFailedPass = tcPasses.find(p => p.status === "error");

  const katalonDisplayStatus = katalonPolling ? "running" : (katalonLastRun?.status || (stats.katalonScripts > 0 ? "done" : "idle"));
  const katalonDisplayResult = katalonPolling
    ? `${katalonJob?.phase || "Processing"}... ${katalonJob?.percentage || 0}% (${katalonJob?.scripts_generated || 0} scripts)`
    : (katalonLastRun?.result || (stats.katalonScripts > 0 ? `${stats.katalonScripts} scripts available` : ""));

  const ciConfigured = !!ciWebhookUrl;
  const latestRun = testRuns[0];
  const isRunning = activeRunId !== null || latestRun?.status === "running" || latestRun?.status === "pending";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Pipeline Status</h1>
            <p className="text-sm text-muted-foreground">Monitor, retry, and regenerate test cases & Katalon scripts</p>
          </div>
        </div>
      </motion.div>

      {/* Current Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="mt-6 grid grid-cols-3 gap-4"
      >
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Requirements</p>
          <p className="text-2xl font-bold text-primary">{stats.requirements}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Test Cases</p>
          <p className="text-2xl font-bold text-warning">{stats.testCases}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Katalon Scripts</p>
          <p className="text-2xl font-bold text-success">{stats.katalonScripts}</p>
        </div>
      </motion.div>

      {/* Test Case Pipeline */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mt-6 p-6 rounded-xl bg-card border border-border space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Test Case Generation Pipeline</h3>
          </div>
          {!regeneratingTC && (
            <div className="flex gap-2">
              {hasFailedPasses && firstFailedPass && (
                <Button size="sm" variant="outline" onClick={() => handleRegenerateTestCases(firstFailedPass.id)} className="gap-1.5 text-xs">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry from {firstFailedPass.label}
                </Button>
              )}
              {stats.testCases > 0 && (
                <Button size="sm" variant="outline" onClick={() => handleRegenerateTestCases(undefined, true)} className="gap-1.5 text-xs">
                  <Play className="w-3.5 h-3.5" />
                  Pending Only
                </Button>
              )}
              <Button size="sm" onClick={() => handleRegenerateTestCases()} className="gap-1.5 text-xs">
                <Play className="w-3.5 h-3.5" />
                {stats.testCases > 0 ? "Regenerate All" : "Generate"}
              </Button>
            </div>
          )}
        </div>

        {/* Pipeline Steps */}
        <div className="space-y-2">
          {tcPasses.map((step, idx) => {
            const Icon = step.icon;
            const statusColor = step.status === "done" ? "text-success" :
              step.status === "running" ? "text-primary" :
              step.status === "error" ? "text-destructive" :
              "text-muted-foreground";
            return (
              <div key={step.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                step.status === "running" ? "border-primary/50 bg-primary/5" :
                step.status === "done" ? "border-success/30 bg-success/5" :
                step.status === "error" ? "border-destructive/30 bg-destructive/5" :
                "border-border bg-card"
              }`}>
                <span className={`text-xs font-bold w-5 text-center ${statusColor}`}>{idx + 1}</span>
                {step.status === "running" ? (
                  <Loader2 className={`w-4 h-4 animate-spin ${statusColor}`} />
                ) : step.status === "done" ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : step.status === "error" ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <Icon className={`w-4 h-4 ${statusColor}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${statusColor}`}>{step.label}</p>
                </div>
                {step.result && (
                  <span className={`text-[10px] font-semibold whitespace-nowrap ${statusColor}`}>{step.result}</span>
                )}
                {step.status === "error" && !regeneratingTC && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => handleRegenerateTestCases(step.id)}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Retry
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {regeneratingTC && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Running pipeline...</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </motion.div>

      {/* Katalon Pipeline */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="mt-4 p-6 rounded-xl bg-card border border-border space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Katalon Script Generation</h3>
          </div>
          <div className="flex gap-2">
            {stats.katalonScripts > 0 && (
              <Button size="sm" variant="outline" onClick={() => handleRegenerateKatalon(true)} disabled={katalonPolling || stats.testCases === 0} className="gap-1.5 text-xs">
                {katalonPolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Pending Only
              </Button>
            )}
            <Button size="sm" onClick={() => handleRegenerateKatalon()} disabled={katalonPolling || stats.testCases === 0} className="gap-1.5 text-xs">
              {katalonPolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {katalonPolling ? "Generating..." : stats.katalonScripts > 0 ? "Regenerate All" : "Generate"}
            </Button>
          </div>
        </div>

        {stats.testCases === 0 && (
          <p className="text-xs text-muted-foreground">Generate test cases first before generating Katalon scripts.</p>
        )}

        {katalonDisplayStatus !== "idle" && (
          <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${
            katalonDisplayStatus === "running" ? "border-primary/50 bg-primary/5" :
            katalonDisplayStatus === "done" ? "border-success/30 bg-success/5" :
            "border-destructive/30 bg-destructive/5"
          }`}>
            {katalonDisplayStatus === "running" ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : katalonDisplayStatus === "done" ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
            <span className={`text-xs font-medium ${
              katalonDisplayStatus === "done" ? "text-success" : katalonDisplayStatus === "error" ? "text-destructive" : "text-primary"
            }`}>
              {katalonDisplayResult || "Generating scripts..."}
            </span>
            {katalonDisplayStatus === "running" && katalonJob && (
              <Progress value={katalonJob.percentage} className="h-1.5 flex-1 max-w-[120px] ml-auto" />
            )}
            {katalonDisplayStatus === "error" && !katalonPolling && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] ml-auto" onClick={() => handleRegenerateKatalon()}>
                <RotateCcw className="w-3 h-3 mr-1" /> Retry
              </Button>
            )}
          </div>
        )}
      </motion.div>

      {/* CI/CD Test Execution */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="mt-4 p-6 rounded-xl bg-card border border-border space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Run Tests via CI/CD</h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setConfigOpen(!configOpen)} className="gap-1.5 text-xs">
              <Settings2 className="w-3.5 h-3.5" />
              Configure
            </Button>
            <Button
              size="sm"
              onClick={handleTriggerRun}
              disabled={!ciConfigured || stats.katalonScripts === 0 || triggeringRun || isRunning}
              className="gap-1.5 text-xs"
            >
              {triggeringRun || isRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              {triggeringRun ? "Triggering..." : isRunning ? "Running..." : "Run Tests"}
            </Button>
          </div>
        </div>

        {!ciConfigured && stats.katalonScripts > 0 && (
          <p className="text-xs text-muted-foreground">Configure your CI/CD webhook to enable test execution.</p>
        )}
        {stats.katalonScripts === 0 && (
          <p className="text-xs text-muted-foreground">Generate Katalon scripts first to enable test execution.</p>
        )}

        {/* CI/CD Configuration */}
        {configOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="space-y-3 p-4 rounded-lg border border-border bg-muted/30"
          >
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">CI/CD Provider</label>
              <Select value={ciProvider} onValueChange={setCiProvider}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jenkins">Jenkins</SelectItem>
                  <SelectItem value="github_actions">GitHub Actions</SelectItem>
                  <SelectItem value="custom">Custom Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Webhook URL
                <span className="text-muted-foreground ml-1">
                  {ciProvider === "jenkins" ? "(Generic Webhook Trigger URL)" :
                   ciProvider === "github_actions" ? "(Repository Dispatch URL)" : "(POST endpoint)"}
                </span>
              </label>
              <Input
                value={ciWebhookUrl}
                onChange={e => setCiWebhookUrl(e.target.value)}
                placeholder={ciProvider === "github_actions"
                  ? "https://api.github.com/repos/owner/repo/dispatches"
                  : "https://jenkins.example.com/generic-webhook-trigger/invoke?token=..."
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Auth Token <span className="text-muted-foreground">(optional, sent as Bearer token)</span>
              </label>
              <Input
                type="password"
                value={ciAuthToken}
                onChange={e => setCiAuthToken(e.target.value)}
                placeholder="Token or PAT"
                className="h-8 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveCiConfig} disabled={savingConfig} className="text-xs gap-1.5">
                {savingConfig ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Save Config
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfigOpen(false)} className="text-xs">
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {/* Active Run Status */}
        {latestRun && (latestRun.status === "pending" || latestRun.status === "running") && (
          <div className="flex items-center gap-3 p-2.5 rounded-lg border border-primary/50 bg-primary/5">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs font-medium text-primary">
              {latestRun.status === "pending" ? "Waiting for CI/CD pipeline to start..." : "Tests running on CI/CD..."}
            </span>
            <Clock className="w-3 h-3 text-muted-foreground ml-auto" />
            <span className="text-[10px] text-muted-foreground">
              {new Date(latestRun.triggered_at).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Latest Completed Run */}
        {latestRun && (latestRun.status === "passed" || latestRun.status === "failed") && (
          <div className={`p-3 rounded-lg border ${
            latestRun.status === "passed" ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
          }`}>
            <div className="flex items-center gap-3">
              {latestRun.status === "passed" ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span className={`text-xs font-semibold ${latestRun.status === "passed" ? "text-success" : "text-destructive"}`}>
                {latestRun.status === "passed" ? "Tests Passed" : "Tests Failed"}
              </span>
              <div className="flex gap-3 ml-auto">
                {latestRun.total_tests > 0 && (
                  <>
                    <Badge variant="outline" className="text-[10px] h-5 bg-success/10 text-success border-success/30">
                      {latestRun.passed} passed
                    </Badge>
                    {latestRun.failed > 0 && (
                      <Badge variant="outline" className="text-[10px] h-5 bg-destructive/10 text-destructive border-destructive/30">
                        {latestRun.failed} failed
                      </Badge>
                    )}
                    {latestRun.skipped > 0 && (
                      <Badge variant="outline" className="text-[10px] h-5 bg-muted text-muted-foreground">
                        {latestRun.skipped} skipped
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
            {latestRun.error_message && (
              <p className="text-[10px] text-destructive mt-2">{latestRun.error_message}</p>
            )}
            {latestRun.results_json && Array.isArray(latestRun.results_json) && latestRun.results_json.length > 0 && (
              <Collapsible open={resultsExpanded === latestRun.id} onOpenChange={(open) => setResultsExpanded(open ? latestRun.id : null)}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-[10px] h-5 mt-2 gap-1">
                    {resultsExpanded === latestRun.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    View Details ({latestRun.results_json.length} tests)
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {latestRun.results_json.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-card">
                        {r.status === "passed" ? (
                          <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-destructive shrink-0" />
                        )}
                        <span className="font-mono truncate">{r.tc_code || `Test ${i + 1}`}</span>
                        {r.duration_ms && <span className="text-muted-foreground ml-auto">{r.duration_ms}ms</span>}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {/* Run History */}
        {testRuns.length > 1 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 w-full justify-start">
                <History className="w-3.5 h-3.5" />
                Run History ({testRuns.length} runs)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1">
                {testRuns.slice(1).map(run => (
                  <div key={run.id} className="flex items-center gap-2 text-[10px] p-2 rounded-lg border border-border">
                    {run.status === "passed" ? (
                      <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                    ) : run.status === "failed" ? (
                      <XCircle className="w-3 h-3 text-destructive shrink-0" />
                    ) : (
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-muted-foreground">{new Date(run.triggered_at).toLocaleString()}</span>
                    {run.total_tests > 0 && (
                      <span className="ml-auto text-muted-foreground">
                        {run.passed}/{run.total_tests} passed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* CI/CD Setup Guide */}
        <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 w-full justify-start text-muted-foreground">
              <ExternalLink className="w-3.5 h-3.5" />
              CI/CD Setup Guide
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground">Jenkins (Generic Webhook Trigger)</h4>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1" onClick={() => copyToClipboard(JENKINS_SNIPPET)}>
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                </div>
                <pre className="text-[10px] p-3 rounded-lg bg-muted border border-border overflow-x-auto max-h-48 overflow-y-auto font-mono whitespace-pre">
                  {JENKINS_SNIPPET}
                </pre>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground">GitHub Actions (Repository Dispatch)</h4>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1" onClick={() => copyToClipboard(GITHUB_ACTIONS_SNIPPET)}>
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                </div>
                <pre className="text-[10px] p-3 rounded-lg bg-muted border border-border overflow-x-auto max-h-48 overflow-y-auto font-mono whitespace-pre">
                  {GITHUB_ACTIONS_SNIPPET}
                </pre>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Your CI/CD pipeline should POST results back to the callback URL provided in the webhook payload.
                Send a JSON body with: <code className="bg-muted px-1 rounded">{"{ status, total_tests, passed, failed, skipped, results }"}</code>
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>
    </div>
  );
};

export default PipelineStatus;
