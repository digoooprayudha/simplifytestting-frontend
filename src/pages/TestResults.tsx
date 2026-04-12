import { TestCasePagination } from "@/components/test-cases/TestCasePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/apiClient";
import { useWizard } from "@/lib/wizardContext";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Settings2,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

// Helper to decode HTML entities
const decodeHtmlEntities = (html: string | null): string => {
  if (!html) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

// Extract short summary from error message (for top-level display)
const getErrorSummary = (errorMsg: string | null): string => {
  if (!errorMsg) return "";

  const decoded = decodeHtmlEntities(errorMsg);
  const lines = decoded.split("\n").filter((line) => line.trim());

  // Find the main error line (usually contains "exception", "unable", "failed")
  const mainError =
    lines.find((line) => {
      const lower = line.toLowerCase();
      return (
        lower.includes("exception") ||
        lower.includes("unable") ||
        lower.includes("failed") ||
        lower.includes("error:")
      );
    }) || lines[0];

  // Clean up and return condensed version
  return (
    mainError?.replace(/\s+/g, " ").trim().slice(0, 200) ||
    decoded.slice(0, 200)
  );
};

// Format full error message (for detail view)
const formatFullError = (errorMsg: string | null): string => {
  if (!errorMsg) return "";

  const decoded = decodeHtmlEntities(errorMsg);

  // Clean up excessive whitespace but keep line breaks
  return decoded
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line)
    .join("\n")
    .slice(0, 5000); // Increased limit for full stack traces
};

const TestResults = () => {
  const { projectId } = useWizard();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringRun, setTriggeringRun] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // CI/CD config
  const [configOpen, setConfigOpen] = useState(false);
  const [ciWebhookUrl, setCiWebhookUrl] = useState("");
  const [ciAuthToken, setCiAuthToken] = useState("");
  const [ciProvider, setCiProvider] = useState("jenkins");
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchTestRuns = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await apiClient.get<TestRun[]>(`/projects/${projectId}/test-runs`);
      setTestRuns(data || []);
    } catch (error) {
      toast.error("Failed to fetch test runs");
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchTestRuns();
  }, [fetchTestRuns]);

  // Load CI config
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const data = await apiClient.get<any>(`/projects/${projectId}/settings`);
        if (data) {
          setCiWebhookUrl(data.ci_webhook_url || "");
          setCiAuthToken(data.ci_auth_token || "");
          setCiProvider(data.ci_provider || "jenkins");
        }
      } catch (error) {
        console.error("Failed to fetch settings");
      }
    })();
  }, [projectId]);

  // Poll active run
  useEffect(() => {
    if (!activeRunId) return;
    const interval = setInterval(async () => {
      try {
        const allRuns = await apiClient.get<TestRun[]>(`/projects/${projectId}/test-runs`);
        const run = allRuns.find(r => r.id === activeRunId);
        if (run) {
          setTestRuns((prev) => prev.map((r) => (r.id === run.id ? run : r)));
          if (run.status === "passed" || run.status === "failed") {
            setActiveRunId(null);
            clearInterval(interval);
            toast[run.status === "passed" ? "success" : "error"](
              run.status === "passed"
                ? `Tests passed! ${run.passed}/${run.total_tests}`
                : `Tests failed. ${run.failed} failures.`,
            );
          }
        }
      } catch (error) {
        console.error("Polling error");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeRunId, projectId]);

  // Filtered
  const filtered = useMemo(() => {
    let result = testRuns;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.status.toLowerCase().includes(q) ||
          new Date(r.triggered_at).toLocaleString().toLowerCase().includes(q) ||
          (r.error_message || "").toLowerCase().includes(q),
      );
    }
    if (filterStatus !== "all")
      result = result.filter((r) => r.status === filterStatus);
    return result;
  }, [testRuns, search, filterStatus]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const updateSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);
  const updateStatus = useCallback((v: string) => {
    setFilterStatus(v);
    setPage(1);
  }, []);
  const updatePageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const hasActiveFilters = search || filterStatus !== "all";

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
    } catch (error) {
      toast.error("Failed to save CI/CD config");
    }
    setSavingConfig(false);
  };

  const handleTriggerRun = async () => {
    if (!projectId) return;
    if (!ciWebhookUrl) {
      toast.error("Please configure CI/CD webhook URL first");
      setConfigOpen(true);
      return;
    }
    setTriggeringRun(true);
    try {
      const response = await apiClient.post<any>("/pipelines/trigger-run", { project_id: projectId });

      if (response.error) {
        throw new Error(response.error);
      }

      const testRunId = response.test_run_id || response.testRunId;
      if (!testRunId) {
        throw new Error("Invalid response from server");
      }

      setActiveRunId(testRunId);
      toast.success("Test run triggered!");
      await fetchTestRuns();
    } catch (err: any) {
      console.error("Trigger fail:", err);
      toast.error("Failed to trigger run: " + (err.message || "Unknown error"));
    } finally {
      setTriggeringRun(false);
    }
  };

  const isRunning =
    activeRunId !== null ||
    testRuns.some((r) => r.status === "pending" || r.status === "running");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-info" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Test Results
              </h1>
              <p className="text-sm text-muted-foreground">
                CI/CD execution history and test run results
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfigOpen(!configOpen)}
              className="gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5" /> CI/CD Config
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchTestRuns}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleTriggerRun}
              disabled={triggeringRun || isRunning}
              className="gap-1.5"
            >
              {triggeringRun || isRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              {triggeringRun
                ? "Triggering..."
                : isRunning
                  ? "Running..."
                  : "Run Tests"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* CI/CD Configuration */}
      {configOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 p-5 rounded-xl bg-card border border-border space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" /> CI/CD Configuration
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfigOpen(false)}
              className="h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                CI Provider
              </label>
              <Select value={ciProvider} onValueChange={setCiProvider}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jenkins">Jenkins</SelectItem>
                  <SelectItem value="github_actions">GitHub Actions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Webhook URL
              </label>
              <Input
                value={ciWebhookUrl}
                onChange={(e) => setCiWebhookUrl(e.target.value)}
                placeholder={
                  ciProvider === "jenkins"
                    ? "https://jenkins.example.com/generic-webhook-trigger/invoke"
                    : "https://api.github.com/repos/owner/repo/dispatches"
                }
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-medium text-foreground">
                Auth Token
              </label>
              <Input
                type="password"
                value={ciAuthToken}
                onChange={(e) => setCiAuthToken(e.target.value)}
                placeholder={
                  ciProvider === "jenkins"
                    ? "Generic Webhook Trigger token"
                    : "GitHub Personal Access Token"
                }
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveCiConfig}
              disabled={savingConfig}
              className="gap-1.5"
            >
              {savingConfig ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {savingConfig ? "Saving..." : "Save Configuration"}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground">
            {ciProvider === "jenkins"
              ? "Requires the Generic Webhook Trigger plugin. The webhook URL should end with /generic-webhook-trigger/invoke."
              : "Requires a PAT with repo scope. The webhook URL should be https://api.github.com/repos/OWNER/REPO/dispatches."}
          </p>
        </motion.div>
      )}

      {/* No webhook warning */}
      {!ciWebhookUrl && !configOpen && (
        <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-center justify-between">
          <p className="text-xs text-warning">
            CI/CD webhook URL not configured. Configure it to trigger test runs.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfigOpen(true)}
            className="h-7 text-xs gap-1 border-warning/30 text-warning hover:bg-warning/10"
          >
            <Settings2 className="w-3 h-3" /> Configure
          </Button>
        </div>
      )}

      {/* Summary stats */}
      {testRuns.length > 0 && (
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Total Runs</p>
            <p className="text-2xl font-bold text-foreground">
              {testRuns.length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Passed</p>
            <p className="text-2xl font-bold text-success">
              {testRuns.filter((r) => r.status === "passed").length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-destructive">
              {testRuns.filter((r) => r.status === "failed").length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Last Run</p>
            <p className="text-sm font-medium text-foreground">
              {testRuns[0]
                ? new Date(testRuns[0].triggered_at).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search test runs..."
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={updateStatus}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setFilterStatus("all");
              setPage(1);
            }}
            className="h-8 gap-1 text-xs text-muted-foreground"
          >
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} results
        </span>
      </div>

      {/* Test Runs */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading...
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground font-medium">
              {testRuns.length === 0
                ? "No test runs yet"
                : "No runs match filters"}
            </p>
            {testRuns.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Configure CI/CD above, then trigger a run.
              </p>
            )}
          </div>
        ) : (
          paginated.map((run) => (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border overflow-hidden ${
                run.status === "passed"
                  ? "border-success/30 bg-success/5"
                  : run.status === "failed"
                    ? "border-destructive/30 bg-destructive/5"
                    : run.status === "pending" || run.status === "running"
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card"
              }`}
            >
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {run.status === "passed" ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : run.status === "failed" ? (
                    <XCircle className="w-5 h-5 text-destructive" />
                  ) : run.status === "pending" || run.status === "running" ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <span
                      className={`text-sm font-semibold ${
                        run.status === "passed"
                          ? "text-success"
                          : run.status === "failed"
                            ? "text-destructive"
                            : "text-foreground"
                      }`}
                    >
                      {run.status === "passed"
                        ? "Tests Passed"
                        : run.status === "failed"
                          ? "Tests Failed"
                          : run.status === "running"
                            ? "Running..."
                            : run.status === "pending"
                              ? "Pending..."
                              : run.status}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(run.triggered_at).toLocaleString()}
                    </p>
                  </div>
                  {run.total_tests > 0 && (
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 bg-success/10 text-success border-success/30"
                      >
                        {run.passed} passed
                      </Badge>
                      {run.failed > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 bg-destructive/10 text-destructive border-destructive/30"
                        >
                          {run.failed} failed
                        </Badge>
                      )}
                      {run.skipped > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 bg-muted text-muted-foreground"
                        >
                          {run.skipped} skipped
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                {run.error_message && (
                  <p className="text-xs text-destructive mt-2">
                    {getErrorSummary(run.error_message)}
                  </p>
                )}
              </div>
              {run.results_json &&
                Array.isArray(run.results_json) &&
                run.results_json.length > 0 && (
                  <Collapsible
                    open={expandedRunId === run.id}
                    onOpenChange={(o) => setExpandedRunId(o ? run.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border-t border-border/50">
                        {expandedRunId === run.id ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        View Details ({run.results_json.length} tests)
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-3 space-y-1 max-h-48 overflow-y-auto">
                        {run.results_json.map((r: any, i: number) => (
                          <div
                            key={i}
                            className="text-[10px] p-1.5 rounded bg-card/50"
                          >
                            <div className="flex items-center gap-2">
                              {r.status === "passed" ? (
                                <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                              ) : (
                                <XCircle className="w-3 h-3 text-destructive shrink-0" />
                              )}
                              <span className="font-mono truncate">
                                {r.tc_code || `Test ${i + 1}`}
                              </span>
                              {r.duration_ms && (
                                <span className="text-muted-foreground ml-auto">
                                  {r.duration_ms}ms
                                </span>
                              )}
                            </div>
                            {r.error_message && (
                              <div className="mt-1.5 p-2 rounded bg-destructive/5 border border-destructive/20">
                                <p className="text-destructive/90 break-words whitespace-pre-wrap font-mono text-[10px] leading-relaxed">
                                  {formatFullError(r.error_message)}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
            </motion.div>
          ))
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
    </div>
  );
};

export default TestResults;
