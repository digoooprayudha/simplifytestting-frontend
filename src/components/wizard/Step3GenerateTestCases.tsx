﻿﻿import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, FileText, Layout, Code2, Layers, CheckCircle2, ShieldCheck, AlertTriangle, Zap, RotateCcw, Figma, FolderCode, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/apiClient";
import { useWizard } from "@/lib/wizardContext";
import { toast } from "sonner";

const typeIcons: Record<string, { icon: any; label: string; color: string }> = {
  functional: { icon: FileText, label: "Functional", color: "text-primary" },
  ui: { icon: Layout, label: "UI Validation", color: "text-info" },
  api: { icon: Code2, label: "API Validation", color: "text-warning" },
  integration: { icon: Layers, label: "Integration", color: "text-success" },
  boundary: { icon: FileText, label: "Boundary", color: "text-destructive" },
  negative: { icon: FileText, label: "Negative", color: "text-destructive" },
  security: { icon: ShieldCheck, label: "Security", color: "text-warning" },
  e2e: { icon: Layers, label: "End-to-End", color: "text-primary" },
  validation: { icon: FileText, label: "Validation", color: "text-info" },
  performance: { icon: Zap, label: "Performance", color: "text-warning" },
  concurrency: { icon: Layers, label: "Concurrency", color: "text-info" },
  compliance: { icon: ShieldCheck, label: "Compliance", color: "text-success" },
  audit: { icon: FileText, label: "Audit", color: "text-muted-foreground" },
};

interface PipelineStep {
  id: string;
  label: string;
  description: string;
  icon: any;
  status: "pending" | "running" | "done" | "error";
  result?: string;
}

interface ProjectStatus {
  doc_count: number;
  has_figma: boolean;
  has_code: boolean;
  code_chunk_count: number;
  total_requirements: number;
}

const Step3GenerateTestCases = () => {
  const { projectId, setCurrentStep, refreshProgress, projectSettings } = useWizard();
  const navigate = useNavigate();
  const [moduleName, setModuleName] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [requirementCount, setRequirementCount] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [isProcessingSources, setIsProcessingSources] = useState(false);
  const [docSummary, setDocSummary] = useState({ brd: 0, fsd: 0, tdd: 0, api_spec: 0, figma: 0, code: 0 });

  // Source selection state
  const [selectedSources, setSelectedSources] = useState<{ documents: boolean; figma: boolean; code: boolean }>({
    documents: true,
    figma: false,
    code: false,
  });

  // Test level selection state
  const [selectedLevels, setSelectedLevels] = useState<{ system: boolean; integration: boolean; uat: boolean }>({
    system: true,
    integration: true,
    uat: true,
  });

  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([
    { id: "generate", label: "Per-Requirement Generation", description: "Generate test cases for each requirement individually", icon: Sparkles, status: "pending" },
    { id: "e2e", label: "E2E Cross-Requirement Flows", description: "Identify integrated user journeys spanning multiple requirements", icon: Layers, status: "pending" },
    { id: "coverage", label: "Coverage Verification", description: "Identify and fill gaps in test coverage", icon: ShieldCheck, status: "pending" },
    { id: "negative", label: "Negative Scenario Matrix", description: "Systematic XSS, SQL injection, boundary tests", icon: AlertTriangle, status: "pending" },
    { id: "review", label: "AI Review Agent", description: "Adversarial QA critic removes redundant/vague/hallucinated tests", icon: Zap, status: "pending" },
  ]);

  const fetchContext = async () => {
    if (!projectId) { setRequirementCount(0); return; }

    try {
      const [status, latestJob] = await Promise.all([
        apiClient.get<ProjectStatus>(`/projects/${projectId}/status`),
        apiClient.get<any>(`/projects/${projectId}/jobs/latest`).catch(() => null),
      ]);

      setRequirementCount(status.total_requirements);

      const isRunning = latestJob && latestJob.status === "running" &&
        ["extract-requirements", "ingest-source-code"].includes(latestJob.job_type);
      setIsProcessingSources(!!isRunning);

      // Detailed doc summary � use doc_count for documents, boolean flags for figma/code
      setDocSummary({
        brd: status.doc_count,
        fsd: 0,
        tdd: 0,
        api_spec: 0,
        figma: status.has_figma ? 1 : 0,
        code: status.code_chunk_count || 0,
      });

      setSelectedSources({
        documents: status.doc_count > 0,
        figma: status.has_figma,
        code: status.has_code,
      });
    } catch (err) {
      console.error("Failed to fetch project context", err);
    }
  };

  useEffect(() => {
    fetchContext();
  }, [projectId]);

  const updateStep = (stepId: string, updates: Partial<PipelineStep>) => {
    setPipelineSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const getSelectedSourcesArray = (): string[] => {
    const sources: string[] = [];
    if (selectedSources.documents) sources.push("documents");
    if (selectedSources.figma) sources.push("figma");
    if (selectedSources.code) sources.push("code");
    return sources;
  };

  const getSelectedLevelsArray = (): string[] => {
    const levels: string[] = [];
    if (selectedLevels.system) levels.push("System");
    if (selectedLevels.integration) levels.push("Integration");
    if (selectedLevels.uat) levels.push("UAT");
    return levels;
  };

  const anySourceSelected = selectedSources.documents || selectedSources.figma || selectedSources.code;
  const anyLevelSelected = selectedLevels.system || selectedLevels.integration || selectedLevels.uat;

  /** Poll job status via FastAPI until completed/failed, with per-step progress update */
  const pollJob = async (stepId: string, prefix?: string, jobId?: string): Promise<number> => {
    const maxAttempts = 180; // 6 minutes max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const url = jobId ? `/projects/${projectId}/jobs/${jobId}` : `/projects/${projectId}/jobs/latest`;
        const job = await apiClient.get<any>(url);
        if (!job) continue;
        if (job.status === "completed") return job.scripts_generated || 0;
        if (job.status === "failed") throw new Error(job.error_message || `${stepId} pass failed`);
        updateStep(stepId, {
          status: "running",
          result: `${job.scripts_generated || 0} ${prefix || "cases"} (${job.percentage || 0}%)`,
        });
      } catch (err: any) {
        if (err.message?.includes("pass failed") || err.message?.includes("failed")) throw err;
      }
    }
    return 0;
  };

  const handleGenerate = async () => {
    if (!anySourceSelected) { toast.error("Please select at least one source."); return; }
    if (!anyLevelSelected) { toast.error("Please select at least one test level."); return; }
    if (requirementCount === 0 && !selectedSources.code) {
      toast.error("No requirements found. Go back and upload sources first.");
      return;
    }

    setGenerating(true);
    setGeneratedCount(0);
    setTypeCounts({});
    setPipelineSteps(prev => prev.map(s => ({ ...s, status: "pending", result: undefined })));

    const sourcesArray = getSelectedSourcesArray();
    const levelsArray = getSelectedLevelsArray();
    const codeOnlyMode = requirementCount === 0 && selectedSources.code;

    // ====== PASS 1: Per-Requirement Generation ======
    updateStep("generate", { status: "running" });
    try {
      const genResp = await apiClient.post<any>("/pipelines/test-cases", {
        project_id: projectId,
        ai_model: projectSettings.ai_model,
        test_levels: levelsArray,
        sources: sourcesArray,
        module_name: moduleName || undefined,
        feature_description: featureDescription || undefined,
        pass_name: "generate",
        code_only_mode: codeOnlyMode,
      });

      const baseCount = await pollJob("generate", "cases", genResp?.jobId || genResp?.job_id);
      setGeneratedCount(baseCount);
      updateStep("generate", { status: "done", result: `${baseCount} test cases` });
      toast.success(`Pass 1 complete: ${baseCount} test cases generated`);
      await fetchContext(); // refresh requirement count in case synthetic ones were added
    } catch (err: any) {
      updateStep("generate", { status: "error", result: err.message || "Failed" });
      toast.error(`Generation failed: ${err.message || "Please try again."}`);
      setGenerating(false);
      return;
    }

    // ====== PASS 2-4: Enhancement passes � trigger ALL in parallel, poll each independently ======
    const enhancePasses = [
      { id: "e2e", pass: "e2e", prefix: "E2E flows" },
      { id: "coverage", pass: "coverage", prefix: "gap cases" },
      { id: "negative", pass: "negative", prefix: "negative cases" },
    ];

    enhancePasses.forEach(ep => updateStep(ep.id, { status: "running" }));

    // Fire all 3 requests simultaneously
    const triggerResults = await Promise.allSettled(
      enhancePasses.map(ep =>
        apiClient.post("/pipelines/test-cases", {
          project_id: projectId,
          ai_model: projectSettings.ai_model,
          sources: sourcesArray,
          module_name: moduleName || undefined,
          pass_name: ep.pass,
        })
      )
    );

    // Poll each pass result independently using specific job_id
    const parallelResults = await Promise.allSettled(
      enhancePasses.map(async (ep, idx) => {
        if (triggerResults[idx].status === "rejected") {
          throw (triggerResults[idx] as PromiseRejectedResult).reason;
        }
        const triggerResp = (triggerResults[idx] as PromiseFulfilledResult<any>).value;
        const jobId = triggerResp?.jobId || triggerResp?.job_id;
        const added = await pollJob(ep.id, ep.prefix, jobId);
        return { ...ep, added };
      })
    );

    parallelResults.forEach((result, idx) => {
      const ep = enhancePasses[idx];
      if (result.status === "fulfilled") {
        const added = result.value.added;
        setGeneratedCount(prev => prev + added);
        updateStep(ep.id, { status: "done", result: `+${added} ${ep.prefix}` });
        if (added > 0) toast.success(`${ep.prefix}: ${added} added`);
      } else {
        updateStep(ep.id, { status: "error", result: result.reason?.message || "Failed" });
      }
    });

    // ====== PASS 5: Review (after 2-4 complete) ======
    updateStep("review", { status: "running" });
    try {
      const reviewResp = await apiClient.post<any>("/pipelines/test-cases", {
        project_id: projectId,
        ai_model: projectSettings.ai_model,
        sources: sourcesArray,
        pass_name: "review",
      });
      await pollJob("review", "reviewed", reviewResp?.jobId || reviewResp?.job_id);
      updateStep("review", { status: "done", result: "Complete" });
    } catch (err: any) {
      updateStep("review", { status: "error", result: err.message || "Failed" });
    }

    // Fetch final counts
    try {
      const tcResponse = await apiClient.get<{ total: number; test_cases: any[] }>(`/projects/${projectId}/test-cases`);
      setGeneratedCount(tcResponse.total || 0);
      const counts: Record<string, number> = {};
      (tcResponse.test_cases || []).forEach((tc: any) => {
        counts[tc.test_type] = (counts[tc.test_type] || 0) + 1;
      });
      setTypeCounts(counts);
    } catch (_) {}

    toast.success(`Pipeline complete!`);
    setGenerating(false);
    await refreshProgress();
  };

  const handleRetryFromPass = async (passId: string) => {
    if (generating) return;
    setGenerating(true);
    const passOrder = ["generate", "e2e", "coverage", "negative", "review"];
    const startIdx = passOrder.indexOf(passId);

    setPipelineSteps(prev => prev.map((s) => {
      const sIdx = passOrder.indexOf(s.id);
      return sIdx >= startIdx ? { ...s, status: "pending", result: undefined } : s;
    }));

    const sourcesArray = getSelectedSourcesArray();

    // If retry starts at generate, run it first
    if (startIdx === 0) {
      updateStep("generate", { status: "running" });
      try {
        await apiClient.post("/pipelines/test-cases", {
          project_id: projectId,
          ai_model: projectSettings.ai_model,
          sources: sourcesArray,
          module_name: moduleName || undefined,
          pass_name: "generate",
        });
        const count = await pollJob("generate", "cases");
        updateStep("generate", { status: "done", result: `${count} cases` });
      } catch (err: any) {
        updateStep("generate", { status: "error", result: err.message || "Failed" });
        setGenerating(false);
        return;
      }
    }

    // Enhancement passes that need to run � trigger in parallel
    const enhanceIds = ["e2e", "coverage", "negative"].filter(id => passOrder.indexOf(id) >= startIdx);
    if (enhanceIds.length > 0) {
      enhanceIds.forEach(id => updateStep(id, { status: "running" }));

      const triggerResults = await Promise.allSettled(
        enhanceIds.map(pass =>
          apiClient.post("/pipelines/test-cases", {
            project_id: projectId,
            ai_model: projectSettings.ai_model,
            sources: sourcesArray,
            module_name: moduleName || undefined,
            pass_name: pass,
          })
        )
      );

      const parallelResults = await Promise.allSettled(
        enhanceIds.map(async (pass, idx) => {
          if (triggerResults[idx].status === "rejected") {
            throw (triggerResults[idx] as PromiseRejectedResult).reason;
          }
          const count = await pollJob(pass);
          return { pass, count };
        })
      );

      parallelResults.forEach((result, idx) => {
        const pass = enhanceIds[idx];
        if (result.status === "fulfilled") {
          updateStep(pass, { status: "done", result: `+${result.value.count} cases` });
        } else {
          updateStep(pass, { status: "error", result: result.reason?.message || "Failed" });
        }
      });
    }

    // Review pass (always last)
    if (passOrder.indexOf("review") >= startIdx) {
      updateStep("review", { status: "running" });
      try {
        await apiClient.post("/pipelines/test-cases", {
          project_id: projectId,
          ai_model: projectSettings.ai_model,
          sources: sourcesArray,
          pass_name: "review",
        });
        await pollJob("review", "reviewed");
        updateStep("review", { status: "done", result: "Complete" });
      } catch (err: any) {
        updateStep("review", { status: "error", result: err.message || "Failed" });
      }
    }

    try {
      const tcResponse = await apiClient.get<{ total: number }>(`/projects/${projectId}/test-cases`);
      setGeneratedCount(tcResponse.total || 0);
    } catch (_) {}

    setGenerating(false);
    toast.success("Retry complete!");
    await refreshProgress();
  };

  const progressPercent = (() => {
    const doneCount = pipelineSteps.filter(s => s.status === "done" || s.status === "error").length;
    const runningCount = pipelineSteps.filter(s => s.status === "running").length;
    return Math.round(((doneCount + runningCount * 0.5) / pipelineSteps.length) * 100);
  })();

  const currentStepLabel = pipelineSteps.find(s => s.status === "running")?.label || "";

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Test Case Generation</h1>
            <p className="text-sm text-muted-foreground">5-pass pipeline with real-time progress</p>
          </div>
        </div>
      </motion.div>

      {/* Source Selection */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
        className="mt-6 p-4 rounded-xl bg-card border border-border"
      >
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Select Sources</h3>
        <div className="flex gap-4">
          <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selectedSources.documents ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"} ${docSummary.brd === 0 ? "opacity-50" : ""}`}>
            <Checkbox
              checked={selectedSources.documents}
              onCheckedChange={(v) => setSelectedSources(prev => ({ ...prev, documents: !!v }))}
              disabled={docSummary.brd === 0}
            />
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Documents</span>
            <span className="text-[10px] text-muted-foreground">({docSummary.brd + docSummary.fsd + docSummary.tdd + docSummary.api_spec} docs)</span>
          </label>

          <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selectedSources.figma ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"} ${!docSummary.figma ? "opacity-50" : ""}`}>
            <Checkbox
              checked={selectedSources.figma}
              onCheckedChange={(v) => setSelectedSources(prev => ({ ...prev, figma: !!v }))}
              disabled={!docSummary.figma}
            />
            <Figma className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Figma</span>
            <span className="text-[10px] text-muted-foreground">({docSummary.figma} screens)</span>
          </label>

          <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selectedSources.code ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"} ${!docSummary.code ? "opacity-50" : ""}`}>
            <Checkbox
              checked={selectedSources.code}
              onCheckedChange={(v) => setSelectedSources(prev => ({ ...prev, code: !!v }))}
              disabled={!docSummary.code}
            />
            <FolderCode className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Code</span>
            <span className="text-[10px] text-muted-foreground">({docSummary.code} chunks)</span>
          </label>
        </div>
        {!anySourceSelected && (
          <p className="text-xs text-destructive mt-2">Please select at least one source</p>
        )}
      </motion.div>

      {/* Test Level Selection */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        className="mt-4 p-4 rounded-xl bg-card border border-border"
      >
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Test Levels</h3>
        <div className="flex gap-4">
          {([
            { key: "system" as const, label: "System", desc: "Component-level isolation tests" },
            { key: "integration" as const, label: "Integration", desc: "Cross-module & API tests" },
            { key: "uat" as const, label: "UAT", desc: "End-user business workflows" },
          ]).map(level => (
            <label key={level.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selectedLevels[level.key] ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
              <Checkbox
                checked={selectedLevels[level.key]}
                onCheckedChange={(v) => setSelectedLevels(prev => ({ ...prev, [level.key]: !!v }))}
              />
              <div>
                <span className="text-xs font-medium">{level.label}</span>
                <p className="text-[10px] text-muted-foreground">{level.desc}</p>
              </div>
            </label>
          ))}
        </div>
        {!anyLevelSelected && (
          <p className="text-xs text-destructive mt-2">Please select at least one test level</p>
        )}
      </motion.div>

      {/* Source Context */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="mt-4 p-4 rounded-xl bg-card border border-border"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source Context</h3>
          <Button variant="ghost" size="sm" onClick={fetchContext} className="h-6 text-[10px] gap-1 px-2">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>

        {isProcessingSources && (
          <div className="mb-4 p-3 rounded-lg bg-info/10 border border-info/30 flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-info animate-spin shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] font-medium text-foreground">Extracting requirements in background...</p>
              <p className="text-[10px] text-muted-foreground">You can click Generate, but results are more accurate when processing is finished.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-6 gap-2">
          {[
            { label: "BRD", count: docSummary.brd, color: "text-primary", active: selectedSources.documents },
            { label: "FSD", count: docSummary.fsd, color: "text-info", active: selectedSources.documents },
            { label: "TDD", count: docSummary.tdd, color: "text-warning", active: selectedSources.documents },
            { label: "API", count: docSummary.api_spec, color: "text-success", active: selectedSources.documents },
            { label: "Figma", count: docSummary.figma, color: "text-accent", active: selectedSources.figma },
            { label: "Code", count: docSummary.code, color: "text-primary", active: selectedSources.code },
          ].map((s) => (
            <div key={s.label} className={`text-center p-2 rounded-lg bg-muted transition-opacity ${s.active ? "opacity-100" : "opacity-30"}`}>
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          <span className="text-primary font-semibold">{requirementCount}</span> total requirements
          {docSummary.code > 0 && selectedSources.code && (
            <span> � <span className="text-primary font-semibold">{docSummary.code}</span> code chunks</span>
          )}
        </p>
      </motion.div>

      {/* Config */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mt-4 p-6 rounded-xl bg-card border border-border space-y-5"
      >
        <div>
          <Label className="text-xs font-medium">Module Name (Optional)</Label>
          <Input
            placeholder="e.g. User Authentication, Payment Processing"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-xs font-medium">Feature Description (Optional)</Label>
          <Textarea
            placeholder="Describe the feature area to focus test generation on..."
            value={featureDescription}
            onChange={(e) => setFeatureDescription(e.target.value)}
            rows={3}
            className="mt-1.5"
          />
        </div>

        {/* Pipeline Steps */}
        <div className="space-y-2">
          {pipelineSteps.map((step, idx) => {
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
                ) : (
                  <Icon className={`w-4 h-4 ${statusColor}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${statusColor}`}>{step.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{step.description}</p>
                </div>
                {step.result && (
                  <span className={`text-[10px] font-semibold whitespace-nowrap ${statusColor}`}>{step.result}</span>
                )}
                {step.status === "error" && !generating && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => handleRetryFromPass(step.id)}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Retry
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {generating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currentStepLabel ? `Running: ${currentStepLabel}` : "Processing..."}</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        <Button onClick={handleGenerate} disabled={generating || !anySourceSelected || !anyLevelSelected} className="w-full gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Running Pipeline..." : "Generate Test Cases (5-Pass Pipeline)"}
        </Button>
      </motion.div>

      {generatedCount > 0 && !generating && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-5 rounded-xl bg-success/10 border border-success/30 space-y-3"
        >
          <div className="flex items-center gap-2 justify-center">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <p className="text-sm font-semibold text-success">{generatedCount} test cases generated</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {Object.entries(typeCounts).map(([type, count]) => {
              const info = typeIcons[type] || { label: type, color: "text-muted-foreground" };
              return (
                <span key={type} className={`text-xs px-2.5 py-1 rounded-full bg-card border border-border font-medium ${info.color}`}>
                  {info.label}: {count}
                </span>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => navigate(`/project/${projectId}/upload`)}>? Back</Button>
        <Button onClick={() => { setCurrentStep(4); navigate(`/project/${projectId}/test-cases`); }} disabled={generatedCount === 0} className="gap-2">
          Review & Refine <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default Step3GenerateTestCases;
