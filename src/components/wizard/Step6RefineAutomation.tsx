import ValidationModal from "@/components/modals/ValidationModal";
import { TestCasePagination } from "@/components/test-cases/TestCasePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GenerationJob, useGenerationJobPoller } from "@/hooks/useGenerationJobPoller";
import { apiClient } from "@/lib/apiClient";
import {
  convertJsonToObjectRepoXml,
  convertJsonToTestSuiteXml,
  generateExecutionSettings,
  generateProfileXml,
  generateProjectFile,
  generateTestCaseMetaXml,
  generateWebUiSettings,
  isJsonContent,
} from "@/lib/katalonProjectFiles";
import { useWizard } from "@/lib/wizardContext";
import { saveAs } from "file-saver";
import { motion } from "framer-motion";
import JSZip from "jszip";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Download, Edit3, FileCode, Loader2, RefreshCw, Save, Search, ShieldCheck, Sparkles, Wrench, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

interface ValidationIssue {
  file: string;
  line?: number;
  severity: "error" | "warning" | "info";
  message: string;
  type: string;
}

interface ValidationSummary {
  total_files: number;
  errors: number;
  warnings: number;
  infos: number;
  placeholders: number;
}

const AUTO_FIX_CHUNK_SIZE = 8;

const Step6RefineAutomation = () => {
  const { katalon, setKatalon, setCurrentStep, projectSettings, projectId } = useWizard();
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [validating, setValidating] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixStats, setFixStats] = useState<{ scripts_fixed: number; total_fixes: number } | null>(null);
  const [regexIssues, setRegexIssues] = useState<any[]>([]);
  const [orWarnings, setOrWarnings] = useState<{ tc_code: string; invalid_paths: string[] }[]>([]);
  const [autoFixing, setAutoFixing] = useState(false);
  const [loadingFromDb, setLoadingFromDb] = useState(false);
  const [aiValidationOpen, setAiValidationOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, script, page, suite
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const pid = projectId || urlProjectId;

  // Missing scripts tracking
  const [totalAutomatable, setTotalAutomatable] = useState(0);
  const [existingScriptsCount, setExistingScriptsCount] = useState(0);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [startingGeneration, setStartingGeneration] = useState(false);
  const [testCaseJobRunning, setTestCaseJobRunning] = useState(false);
  const [pendingTCs, setPendingTCs] = useState(0);

  const handleJobComplete = useCallback(async (completedJob: GenerationJob) => {
    if (!pid) return;
    const { loadKatalonFromDb } = await import("@/lib/wizardContext");
    const katalonData = await loadKatalonFromDb(pid);
    if (katalonData) {
      setKatalon(katalonData);
      setExistingScriptsCount(katalonData.scripts.length);
    }
    setCurrentJobId(null);
    toast.success(`Generation complete! ${completedJob.scripts_generated} scripts generated.`);
  }, [pid, setKatalon]);

  const handleJobError = useCallback((failedJob: GenerationJob) => {
    toast.error(failedJob.error_message || "Generation failed");
    setCurrentJobId(null);
  }, []);

  const { job: genJob, polling: generating } = useGenerationJobPoller({
    projectId: pid,
    jobId: currentJobId,
    onComplete: handleJobComplete,
    onError: handleJobError,
  });

  const handleGenerateMissing = useCallback(async () => {
    if (generating || startingGeneration || !pid) return;
    setStartingGeneration(true);
    try {
      const response = await apiClient.post<{ jobId?: string; allCovered?: boolean; error?: string; totalTestCases?: number }>("/pipelines/automation", {
        project_id: pid,
        missing_only: true,
      });
      if (response.allCovered) {
        toast.success("All test cases already have Katalon scripts — 100% coverage! 🎉");
        setStartingGeneration(false);
        return;
      }
      if (response.error) throw new Error(response.error);
      setCurrentJobId(response.jobId || "polling");
      toast.info(`Generating ${response.totalTestCases ?? "?"} missing scripts...`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start generation");
    } finally {
      setStartingGeneration(false);
    }
  }, [pid, generating, startingGeneration]);

  // Load counts via FastAPI
  useEffect(() => {
    if (!pid) return;
    const loadCounts = async () => {
      try {
        const [latestJob, tcData, katalonData] = await Promise.all([
          apiClient.get<any>(`/projects/${pid}/jobs/latest`).catch(() => null),
          apiClient.get<{ test_cases: any[] }>(`/projects/${pid}/test-cases`).catch(() => ({ test_cases: [] })),
          apiClient.get<{ scripts: any[] }>(`/projects/${pid}/katalon`).catch(() => ({ scripts: [] })),
        ]);

        const isRunningTcJob = latestJob && latestJob.status === "running" &&
          (latestJob.job_type === "test_cases" || latestJob.job_type === "test_cases_pipeline");
        setTestCaseJobRunning(!!isRunningTcJob);

        const allTcs = tcData.test_cases || [];
        const automatable = allTcs.filter((tc: any) => tc.automation_eligible && tc.status === "approved");
        const pending = allTcs.filter((tc: any) => tc.automation_eligible && tc.status !== "approved");
        setExistingScriptsCount(katalonData.scripts?.length || 0);
        setTotalAutomatable(automatable.length);
        setPendingTCs(pending.length);
      } catch (err) {
        console.error("Failed to load counts", err);
      }
    };
    loadCounts();
  }, [pid, katalon]);

  const missingCount = totalAutomatable - existingScriptsCount;
  const isBusy = generating || startingGeneration;

  // Load from DB if not in context
  useEffect(() => {
    if (katalon || !pid) return;
    const load = async () => {
      setLoadingFromDb(true);
      const { loadKatalonFromDb } = await import("@/lib/wizardContext");
      const katalonData = await loadKatalonFromDb(pid);
      if (katalonData) setKatalon(katalonData);
      setLoadingFromDb(false);
    };
    load();
  }, [pid, katalon]);

  // Build flat list of all files for filtering/pagination
  const allFiles = useMemo(() => {
    if (!katalon) return [];
    const files: { type: string; idx: number; filePath: string; content: string; label: string }[] = [];
    katalon.scripts.forEach((s, i) => files.push({ type: "script", idx: i, filePath: s.file_path, content: s.content, label: "Test Script" }));
    katalon.page_objects.forEach((p, i) => files.push({ type: "page", idx: i, filePath: p.file_path, content: p.content, label: "Object Repository" }));
    files.push({ type: "suite", idx: 0, filePath: katalon.test_suite.file_path, content: katalon.test_suite.content, label: "Test Suite" });
    return files;
  }, [katalon]);

  // Filtered
  const filtered = useMemo(() => {
    let result = allFiles;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f => f.filePath.toLowerCase().includes(q) || f.content.toLowerCase().includes(q));
    }
    if (filterType !== "all") result = result.filter(f => f.type === filterType);
    return result;
  }, [allFiles, search, filterType]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const updateSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const updateFilterType = useCallback((v: string) => { setFilterType(v); setPage(1); }, []);
  const updatePageSize = useCallback((size: number) => { setPageSize(size); setPage(1); }, []);
  const hasActiveFilters = search || filterType !== "all";

  if (loadingFromDb) {
    return <div className="p-8 text-center text-muted-foreground">Loading automation scripts from database…</div>;
  }

  if (!katalon) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center mt-20">
        <p className="text-muted-foreground">No automation code generated yet. Go back to Test Cases.</p>
        <Button variant="outline" onClick={() => navigate(`/project/${urlProjectId}/test-cases`)} className="mt-4">← Back to Test Cases</Button>
      </div>
    );
  }

  const runValidation = async () => {
    setValidating(true);
    setFixStats(null);
    try {
      const result = await apiClient.post<{ issues: ValidationIssue[]; summary: ValidationSummary }>("/pipelines/katalon/syntax-check", {
        project_id: pid,
      });
      setValidationIssues(result.issues || []);
      setValidationSummary(result.summary || null);
      if (result.summary?.errors > 0) toast.error(`${result.summary.errors} errors found`);
      else if (result.summary?.warnings > 0) toast.warning(`${result.summary.warnings} warnings, ${result.summary.placeholders} placeholders`);
      else toast.success("All scripts passed validation!");
    } catch (err: any) { toast.error(err.message || "Validation failed"); }
    // Check Object Repository references
    try {
      const orResult = await apiClient.post<{ results: any[] }>("/pipelines/katalon/validate-references", { project_id: pid });
      const orWarns = (orResult.results || []).filter((r: any) => r.status === "warning");
      setOrWarnings(orWarns.map((r: any) => ({ tc_code: r.tc_code, invalid_paths: r.invalid_paths })));
      if (orWarns.length > 0) toast.warning(`${orWarns.length} script(s) have invalid Object Repository paths`);
    } catch (_) {}
    setValidating(false);
  };

  const runRegexCheck = async () => {
    setValidating(true);
    try {
      const result = await apiClient.post<{ results: any[]; errors: number; warnings: number }>("/pipelines/katalon/regex-check", { project_id: pid });
      setRegexIssues(result.results || []);
      const errCount = result.errors || 0;
      const warnCount = result.warnings || 0;
      if (errCount > 0) toast.error(`${errCount} script(s) have fixable errors`);
      else if (warnCount > 0) toast.warning(`${warnCount} script(s) have warnings`);
      else toast.success("All scripts passed regex check!");
    } catch (err: any) { toast.error(err.message || "Regex check failed"); }
    setValidating(false);
  };

  const autoFixAll = async () => {
    setAutoFixing(true);
    try {
      const result = await apiClient.post<{ fixed: number; total: number }>("/pipelines/katalon/auto-fix-all", { project_id: pid });
      toast.success(`Auto-fixed ${result.fixed} of ${result.total} scripts`);
      setRegexIssues([]);
      // Reload scripts
      const katalonData = await loadKatalonFromDb(pid);
      if (katalonData) setKatalon(katalonData);
    } catch (err: any) { toast.error(err.message || "Auto-fix failed"); }
    setAutoFixing(false);
  };

  const runAutoFix = async () => {
    if (!validationIssues.length || !katalon) return;
    setFixing(true);
    try {
      const result = await apiClient.post<{ stats: { scripts_fixed: number; total_fixes: number } }>("/pipelines/katalon/validate", {
        project_id: pid,
      });
      setFixStats({ scripts_fixed: result.stats?.scripts_fixed || 0, total_fixes: result.stats?.total_fixes || 0 });
      setValidationIssues([]);
      setValidationSummary(null);
      // Reload katalon from DB
      const { loadKatalonFromDb } = await import("@/lib/wizardContext");
      const katalonData = await loadKatalonFromDb(pid!);
      if (katalonData) setKatalon(katalonData);
      toast.success(`Auto-fix applied: ${result.stats?.total_fixes || 0} fixes`);
    } catch (err: any) { toast.error(err.message || "Auto-fix failed"); }
    setFixing(false);
  };

  const startEdit = (type: string, idx: number) => {
    const key = `${type}-${idx}`;
    setEditingKey(key);
    if (type === "script") setEditContent(katalon.scripts[idx].content);
    else if (type === "page") setEditContent(katalon.page_objects[idx].content);
    else if (type === "suite") setEditContent(katalon.test_suite.content);
  };

  const saveEdit = async () => {
    if (!editingKey) return;
    const [type, idxStr] = editingKey.split("-");
    const idx = parseInt(idxStr);
    const updated = { ...katalon };
    if (type === "script") {
      updated.scripts = [...updated.scripts];
      updated.scripts[idx] = { ...updated.scripts[idx], content: editContent };
    } else if (type === "page") {
      updated.page_objects = [...updated.page_objects];
      updated.page_objects[idx] = { ...updated.page_objects[idx], content: editContent };
    } else if (type === "suite") {
      updated.test_suite = { ...updated.test_suite, content: editContent };
    }
    setKatalon(updated);
    setEditingKey(null);
    setValidationIssues([]);
    setValidationSummary(null);
    toast.success("Code updated locally — regenerate to persist to database");
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    const root = "SimplifyTestingProject";
    zip.file(`${root}/${projectSettings.project_name || "SimplifyTesting"}.prj`, generateProjectFile(projectSettings.project_name || "SimplifyTesting"));
    zip.file(`${root}/Profiles/default.glbl`, generateProfileXml(projectSettings.base_url || "https://example.com"));
    zip.file(`${root}/settings/internal/com.kms.katalon.core.webui.webui.properties`, generateWebUiSettings(projectSettings.browser_type || "Chrome"));
    zip.file(`${root}/settings/execution/default.properties`, generateExecutionSettings());
    katalon.scripts.forEach(s => zip.file(`${root}/${s.file_path}`, s.content));
    katalon.scripts.forEach(s => { const tcCode = s.file_path.split("/")[1]; if (tcCode) zip.file(`${root}/Test Cases/${tcCode}.tc`, generateTestCaseMetaXml(tcCode)); });
    katalon.page_objects.forEach(p => { const content = isJsonContent(p.content) ? convertJsonToObjectRepoXml(p.content) : p.content; zip.file(`${root}/${p.file_path}`, content); });
    const suiteContent = isJsonContent(katalon.test_suite.content) ? convertJsonToTestSuiteXml(katalon.test_suite.content) : katalon.test_suite.content;
    zip.file(`${root}/${katalon.test_suite.file_path}`, suiteContent);
    if (katalon.data_files) katalon.data_files.forEach(d => zip.file(`${root}/${d.file_path}`, d.content));
    zip.folder(`${root}/Keywords`); zip.folder(`${root}/Drivers`); zip.folder(`${root}/Include/scripts/groovy`); zip.folder(`${root}/Data Files`); zip.folder(`${root}/Checkpoints`);
    if (validationSummary) {
      const report = `# Validation Report\n\nFiles: ${validationSummary.total_files}\nErrors: ${validationSummary.errors}\nWarnings: ${validationSummary.warnings}\nPlaceholders: ${validationSummary.placeholders}\n\n## Issues\n${validationIssues.map(i => `- [${i.severity.toUpperCase()}] ${i.file}${i.line ? `:${i.line}` : ""} — ${i.message}`).join("\n")}`;
      zip.file(`${root}/VALIDATION_REPORT.md`, report);
    }
    zip.file(`${root}/README.md`, `# ${projectSettings.project_name || "SimplifyTesting"} — Katalon Automation Package\n\nGenerated by SimplifyTesting AI Test Engineering Platform.\n\n## How to Import\n1. Open Katalon Studio\n2. File → Open Project\n3. Navigate to this extracted folder and select the .prj file\n4. Katalon will load all Test Cases, Object Repository, and Test Suites\n\n## Project Config\n- Base URL: ${projectSettings.base_url}\n- Browser: ${projectSettings.browser_type}\n- Locator Strategy: ${projectSettings.locator_strategy}\n- Naming Convention: ${projectSettings.naming_convention}\n`);
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${projectSettings.project_name || "SimplifyTesting"}_Katalon.zip`);
    toast.success("Katalon project package downloaded!");
  };

  const renderFileBlock = (type: string, idx: number, filePath: string, content: string) => {
    const key = `${type}-${idx}`;
    const isEditing = editingKey === key;
    const fileIssues = validationIssues.filter(i => i.file === filePath);
    return (
      <div key={key} className="rounded-lg bg-surface border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-muted">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[9px] h-4">{type === "script" ? "Script" : type === "page" ? "Object" : "Suite"}</Badge>
            <span className="text-xs font-mono text-muted-foreground truncate">{filePath}</span>
          </div>
          <div className="flex gap-1 items-center">
            {fileIssues.length > 0 && (
              <Badge variant={fileIssues.some(i => i.severity === "error") ? "destructive" : "secondary"} className="text-[10px]">
                {fileIssues.length} issue{fileIssues.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {!isEditing && (
              <button onClick={() => startEdit(type, idx)} className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground"><Edit3 className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="p-3 space-y-2">
            <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={14} className="text-xs font-mono" />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} className="gap-1"><Save className="w-3 h-3" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingKey(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <pre className="p-4 text-xs font-mono text-foreground/80 overflow-x-auto max-h-48 whitespace-pre-wrap">{content}</pre>
        )}
        {fileIssues.length > 0 && !isEditing && (
          <div className="px-4 pb-3 space-y-1">
            {fileIssues.map((issue, ii) => (
              <div key={ii} className="flex items-start gap-2 text-xs">
                {issue.severity === "error" ? <XCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" /> :
                 issue.severity === "warning" ? <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" /> :
                 <CheckCircle2 className="w-3 h-3 text-info shrink-0 mt-0.5" />}
                <span className={issue.severity === "error" ? "text-destructive" : issue.severity === "warning" ? "text-warning" : "text-muted-foreground"}>
                  {issue.line ? `L${issue.line}: ` : ""}{issue.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
              <FileCode className="w-5 h-5 text-success" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Katalon Scripts</h1>
              <p className="text-sm text-muted-foreground">Validate, edit scripts, then download the final ZIP package</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAiValidationOpen(true)} disabled={allFiles.length === 0} className="gap-2">
              <Sparkles className="w-4 h-4" /> AI Validate
            </Button>
            <Button variant="outline" onClick={runValidation} disabled={validating} className="gap-2">
              <ShieldCheck className="w-4 h-4" /> {validating ? "Validating..." : "Syntax Check"}
            </Button>
            <Button variant="outline" onClick={runRegexCheck} disabled={validating || autoFixing} className="gap-2">
              <ShieldCheck className="w-4 h-4" /> Regex Check
            </Button>
            {regexIssues.some((r: any) => r.status === "error" || r.status === "warning") && (
              <Button variant="destructive" size="sm" onClick={autoFixAll} disabled={autoFixing} className="gap-2">
                {autoFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {autoFixing ? "Fixing..." : "Auto-Fix All"}
              </Button>
            )}
            <Button onClick={downloadZip} className="gap-2"><Download className="w-4 h-4" /> Download ZIP</Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="mt-4 flex gap-3 flex-wrap">
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          <p className="text-xs text-muted-foreground">Scripts</p>
          <p className="text-lg font-bold text-foreground">{katalon.scripts.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          <p className="text-xs text-muted-foreground">Objects</p>
          <p className="text-lg font-bold text-foreground">{katalon.page_objects.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          <p className="text-xs text-muted-foreground">Total Files</p>
          <p className="text-lg font-bold text-foreground">{allFiles.length}</p>
        </div>
      </div>

      {/* Missing scripts banner */}
      {(missingCount > 0 || pendingTCs > 0 || testCaseJobRunning) && !generating && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-4 rounded-xl border ${testCaseJobRunning ? 'bg-info/10 border-info/30' : 'bg-warning/10 border-warning/30'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {testCaseJobRunning ? (
                <Loader2 className="w-5 h-5 text-info animate-spin shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {testCaseJobRunning 
                    ? "Additional test cases are being generated in the background..." 
                    : missingCount > 0 
                      ? `${missingCount} approved test case${missingCount !== 1 ? "s" : ""} missing Katalon scripts`
                      : "New test cases are awaiting review/approval"}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    {existingScriptsCount} of {totalAutomatable} approved tests covered ({Math.round((existingScriptsCount / Math.max(totalAutomatable, 1)) * 100)}%)
                  </p>
                  {pendingTCs > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-warning" />
                      {pendingTCs} test case{pendingTCs !== 1 ? "s" : ""} pending review
                    </p>
                  )}
                </div>
              </div>
            </div>
            {missingCount > 0 && !testCaseJobRunning && (
              <Button onClick={handleGenerateMissing} disabled={isBusy} variant="outline" className="gap-2 border-warning/30 text-warning hover:bg-warning/10">
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Generate Missing Scripts
              </Button>
            )}
            {testCaseJobRunning && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/project/${pid}/test-cases`)} className="gap-2 border-info/30 text-info hover:bg-info/10">
                View Progress
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Generation progress */}
      {generating && genJob && (
        <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              Batch {genJob.completed_batches + genJob.failed_batches}/{genJob.total_batches} • {genJob.scripts_generated} scripts generated
            </span>
            <span className="font-mono text-primary font-semibold">{genJob.percentage}%</span>
          </div>
          <Progress value={genJob.percentage} className="h-2" />
          {genJob.failed_batches > 0 && (
            <p className="text-xs text-warning">⚠ {genJob.failed_batches} batch(es) failed, continuing...</p>
          )}
          <p className="text-[10px] text-muted-foreground italic">
            💡 You can navigate away — generation continues in the background.
          </p>
        </div>
      )}
      {/* Validation Summary */}
      {validationSummary && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-4 rounded-xl border ${
            validationSummary.errors > 0 ? "bg-destructive/10 border-destructive/30" :
            validationSummary.warnings > 0 ? "bg-warning/10 border-warning/30" : "bg-success/10 border-success/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              {validationSummary.errors > 0 ? <XCircle className="w-5 h-5 text-destructive" /> :
               validationSummary.warnings > 0 ? <AlertTriangle className="w-5 h-5 text-warning" /> :
               <CheckCircle2 className="w-5 h-5 text-success" />}
              <span className="font-semibold text-foreground">
                {validationSummary.errors} errors · {validationSummary.warnings} warnings · {validationSummary.placeholders} placeholders · {validationSummary.infos} suggestions
              </span>
            </div>
            {(validationSummary.errors > 0 || validationSummary.warnings > 0 || validationSummary.placeholders > 0) && (
              <Button size="sm" variant="outline" onClick={runAutoFix} disabled={fixing} className="gap-2">
                {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                {fixing ? "Fixing…" : "Auto-Fix Issues"}
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Regex Check Issues */}
      {regexIssues.some((r: any) => r.issue_count > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl border bg-destructive/10 border-destructive/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">
                {regexIssues.filter((r: any) => r.issue_count > 0).length} script(s) with fixable issues
              </span>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {regexIssues.filter((r: any) => r.issue_count > 0).map((script: any, i: number) => (
              <div key={i} className="text-xs border-b border-border pb-1">
                <span className="font-mono text-destructive font-semibold">{script.tc_code}</span>
                <div className="ml-2 space-y-0.5 mt-0.5">
                  {script.issues.slice(0, 3).map((issue: any, j: number) => (
                    <div key={j} className="text-muted-foreground">
                      Line {issue.line}: {issue.message}
                      {issue.can_auto_fix && <span className="ml-1 text-success text-[10px]">[auto-fixable]</span>}
                    </div>
                  ))}
                  {script.issues.length > 3 && <div className="text-muted-foreground">+{script.issues.length - 3} more issues</div>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Object Repository Reference Warnings */}
      {orWarnings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl border bg-warning/10 border-warning/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold text-warning">{orWarnings.length} script(s) with invalid Object Repository paths</span>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {orWarnings.map((w, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                <span className="font-mono text-warning">{w.tc_code}</span>: {w.invalid_paths.slice(0, 3).join(", ")}{w.invalid_paths.length > 3 ? ` +${w.invalid_paths.length - 3} more` : ""}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">These paths were not found in the Object Repository. The script may use invented element names.</p>
        </motion.div>
      )}

      {fixStats && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 p-3 rounded-xl bg-success/10 border border-success/30">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-foreground">Auto-fix complete: <strong>{fixStats.total_fixes}</strong> fixes across <strong>{fixStats.scripts_fixed}</strong> scripts. Re-validate to confirm.</span>
            <Button size="sm" variant="outline" onClick={runValidation} className="ml-auto gap-1 h-7 text-xs"><ShieldCheck className="w-3 h-3" /> Re-validate</Button>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => updateSearch(e.target.value)} placeholder="Search scripts by path or content..." className="pl-9 h-8 text-sm" />
        </div>
        <Select value={filterType} onValueChange={updateFilterType}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="script">Test Scripts</SelectItem>
            <SelectItem value="page">Object Repository</SelectItem>
            <SelectItem value="suite">Test Suite</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setFilterType("all"); setPage(1); }} className="h-8 gap-1 text-xs text-muted-foreground"><X className="w-3 h-3" /> Clear</Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} files</span>
      </div>

      {/* File list */}
      <div className="mt-4 space-y-3">
        {paginated.map(f => renderFileBlock(f.type, f.idx, f.filePath, f.content))}
        {paginated.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No files match the filters.</div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <TestCasePagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={updatePageSize}
        />
      )}

      {/* Folder structure */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-5 rounded-xl bg-card border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">Katalon Project Structure</h3>
        <pre className="text-xs font-mono text-muted-foreground">{`${projectSettings.project_name || "SimplifyTesting"}/
├── ${projectSettings.project_name || "SimplifyTesting"}.prj          ← Katalon project file
├── Profiles/
│   └── default.glbl                 ← GlobalVariable.base_url
├── Scripts/
│   ${katalon.scripts.slice(0, 5).map(s => s.file_path.split("/").slice(1).join("/")).join("\n│   ")}${katalon.scripts.length > 5 ? `\n│   ... (${katalon.scripts.length - 5} more)` : ""}
├── Test Cases/
│   ${katalon.scripts.slice(0, 5).map(s => { const tc = s.file_path.split("/")[1]; return tc + ".tc"; }).join("\n│   ")}${katalon.scripts.length > 5 ? `\n│   ... (${katalon.scripts.length - 5} more)` : ""}
├── Object Repository/
│   ${katalon.page_objects.slice(0, 5).map(p => p.file_path.replace("Object Repository/", "")).join("\n│   ")}${katalon.page_objects.length > 5 ? `\n│   ... (${katalon.page_objects.length - 5} more)` : ""}
├── Test Suites/
│   └── ${katalon.test_suite.file_path.split("/").pop()}
├── Keywords/
├── settings/
│   ├── internal/
│   └── execution/
${validationSummary ? "├── VALIDATION_REPORT.md\n" : ""}└── README.md`}</pre>
      </motion.div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => navigate(`/project/${urlProjectId}/test-cases`)}>← Test Cases</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/project/${urlProjectId}/results`)} className="gap-2">Test Results <ArrowRight className="w-4 h-4" /></Button>
          <Button onClick={downloadZip} className="gap-2"><Download className="w-4 h-4" /> Download Katalon Project</Button>
        </div>
      </div>

      {pid && (
        <ValidationModal
          open={aiValidationOpen}
          onOpenChange={setAiValidationOpen}
          artifactType="katalon_scripts"
          projectId={pid}
          onAccepted={async () => {
            if (!pid) return;
            const { loadKatalonFromDb } = await import("@/lib/wizardContext");
            const katalonData = await loadKatalonFromDb(pid);
            if (katalonData) setKatalon(katalonData);
          }}
        />
      )}
    </div>
  );
};

export default Step6RefineAutomation;
