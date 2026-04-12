import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitBranch, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight, FileCode, ArrowRight } from "lucide-react";
import { useWizard } from "@/lib/wizardContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/lib/apiClient";

interface Requirement {
  id: string;
  req_code: string;
  title: string;
  priority: string;
  category: string | null;
}

interface TestCase {
  id: string;
  tc_code: string;
  title: string;
  test_type: string | null;
  status: string;
  priority: string;
  requirement_id: string;
  automation_eligible: boolean | null;
}

interface KatalonScript {
  id: string;
  tc_code: string;
  test_case_id: string | null;
  file_path: string;
  content: string;
  created_at: string;
}

const TraceabilityMatrix = () => {
  const { projectId } = useWizard();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [katalonScripts, setKatalonScripts] = useState<KatalonScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) { setLoading(false); return; }
      try {
        const data = await apiClient.get<any>(`/projects/${projectId}/traceability`);
        setRequirements(data.requirements || []);
        setTestCases(data.test_cases || []);
        setKatalonScripts(data.katalon_scripts || []);
      } catch (error) {
        console.error("Traceability fetch failed");
      }
      setLoading(false);
    };
    fetchData();
  }, [projectId]);

  // Build tc_code → katalon script mapping from DB
  const scriptByTcCode: Record<string, KatalonScript> = {};
  const scriptByTestCaseId: Record<string, KatalonScript> = {};
  katalonScripts.forEach((s) => {
    scriptByTcCode[s.tc_code] = s;
    if (s.test_case_id) scriptByTestCaseId[s.test_case_id] = s;
  });

  const tcByReq = testCases.reduce<Record<string, TestCase[]>>((acc, tc) => {
    (acc[tc.requirement_id] ||= []).push(tc);
    return acc;
  }, {});

  const coveredReqs = requirements.filter((r) => (tcByReq[r.id] || []).length > 0);
  const uncoveredReqs = requirements.filter((r) => (tcByReq[r.id] || []).length === 0);
  const coveragePercent = requirements.length > 0 ? Math.round((coveredReqs.length / requirements.length) * 100) : 0;

  // Automation coverage from DB
  const automationEligible = testCases.filter((tc) => tc.automation_eligible);
  const automatedTcs = automationEligible.filter((tc) => scriptByTcCode[tc.tc_code] || scriptByTestCaseId[tc.id]);
  const automationPercent = automationEligible.length > 0 ? Math.round((automatedTcs.length / automationEligible.length) * 100) : 0;

  // Full chain coverage: Req → TC → Script
  const fullChainReqs = requirements.filter((r) => {
    const tcs = tcByReq[r.id] || [];
    return tcs.length > 0 && tcs.some((tc) => scriptByTcCode[tc.tc_code] || scriptByTestCaseId[tc.id]);
  });
  const fullChainPercent = requirements.length > 0 ? Math.round((fullChainReqs.length / requirements.length) * 100) : 0;

  const testTypes = [...new Set(testCases.map((tc) => tc.test_type || "functional"))];
  const typeStats = testTypes.map((t) => ({ type: t, count: testCases.filter((tc) => (tc.test_type || "functional") === t).length }));

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading traceability data…</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Traceability Matrix</h1>
            <p className="text-sm text-muted-foreground">Requirement → Test Case → Katalon Script — full chain coverage</p>
          </div>
        </div>

        {/* Chain legend */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 mb-6">
          <Badge variant="outline" className="gap-1 text-[10px]">📋 Requirement</Badge>
          <ArrowRight className="w-3 h-3" />
          <Badge variant="outline" className="gap-1 text-[10px]">✅ Test Case</Badge>
          <ArrowRight className="w-3 h-3" />
          <Badge variant="outline" className="gap-1 text-[10px]">⚙️ Katalon Script</Badge>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Requirements</p>
          <p className="text-2xl font-bold text-foreground">{requirements.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Test Cases</p>
          <p className="text-2xl font-bold text-foreground">{testCases.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Req Coverage</p>
          <p className={`text-2xl font-bold ${coveragePercent === 100 ? "text-success" : coveragePercent >= 70 ? "text-warning" : "text-destructive"}`}>
            {coveragePercent}%
          </p>
          <Progress value={coveragePercent} className="mt-2 h-1.5" />
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Katalon Scripts</p>
          <p className="text-2xl font-bold text-foreground">{katalonScripts.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Automation Coverage</p>
          <p className={`text-2xl font-bold ${automationPercent === 100 ? "text-success" : automationPercent >= 70 ? "text-warning" : automationPercent > 0 ? "text-primary" : "text-muted-foreground"}`}>
            {automationPercent}%
          </p>
          <Progress value={automationPercent} className="mt-2 h-1.5" />
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground">Full Chain</p>
          <p className={`text-2xl font-bold ${fullChainPercent === 100 ? "text-success" : fullChainPercent >= 70 ? "text-warning" : fullChainPercent > 0 ? "text-primary" : "text-muted-foreground"}`}>
            {fullChainPercent}%
          </p>
          <Progress value={fullChainPercent} className="mt-2 h-1.5" />
        </div>
      </div>

      {/* Test Type Distribution */}
      {typeStats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {typeStats.map((t) => (
            <Badge key={t.type} variant="secondary" className="text-xs">
              {t.type}: {t.count}
            </Badge>
          ))}
        </div>
      )}

      {/* Coverage Gaps */}
      {uncoveredReqs.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-semibold text-destructive">Uncovered Requirements ({uncoveredReqs.length})</h3>
          </div>
          <div className="space-y-1">
            {uncoveredReqs.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <XCircle className="w-3 h-3 text-destructive shrink-0" />
                <span className="font-mono text-destructive">{r.req_code}</span>
                <span className="text-foreground truncate">{r.title}</span>
                <Badge variant="outline" className="ml-auto text-[10px]">{r.priority}</Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Full Traceability Matrix */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[180px_1fr_160px] bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Requirement</span>
          <span>Test Cases</span>
          <span>Katalon</span>
        </div>
        {requirements.map((req) => {
          const tcs = tcByReq[req.id] || [];
          const isExpanded = expandedReq === req.id;
          const hasScripts = tcs.some((tc) => scriptByTcCode[tc.tc_code] || scriptByTestCaseId[tc.id]);
          const scriptCount = tcs.filter((tc) => scriptByTcCode[tc.tc_code] || scriptByTestCaseId[tc.id]).length;

          return (
            <div key={req.id} className="border-t border-border">
              <button
                onClick={() => setExpandedReq(isExpanded ? null : req.id)}
                className="w-full grid grid-cols-[180px_1fr_160px] px-4 py-3 hover:bg-muted/50 transition-colors items-center text-left"
              >
                <div className="flex items-center gap-2">
                  {tcs.length > 0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  )}
                  <span className="text-xs font-mono text-foreground">{req.req_code}</span>
                  {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground truncate">{req.title}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{tcs.length} TC{tcs.length !== 1 ? "s" : ""}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasScripts ? (
                    <>
                      <FileCode className="w-3.5 h-3.5 text-success shrink-0" />
                      <span className="text-xs text-success font-medium">{scriptCount}/{tcs.length}</span>
                    </>
                  ) : tcs.length > 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : null}
                </div>
              </button>

              {isExpanded && tcs.length > 0 && (
                <div className="px-4 pb-3 pl-10 space-y-2">
                  {tcs.map((tc) => {
                    const script = scriptByTcCode[tc.tc_code] || scriptByTestCaseId[tc.id];
                    return (
                      <div key={tc.id} className="rounded-lg bg-muted/30 p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                          <span className="font-mono text-foreground font-medium">{tc.tc_code}</span>
                          <span className="text-muted-foreground truncate">{tc.title}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{tc.test_type || "functional"}</Badge>
                          <Badge variant={tc.status === "approved" ? "default" : "outline"} className="text-[10px] shrink-0">{tc.status}</Badge>
                          {tc.automation_eligible && (
                            <Badge variant="outline" className="text-[10px] shrink-0 text-primary border-primary/30">automatable</Badge>
                          )}
                        </div>

                        {/* Katalon Script Link */}
                        {script ? (
                          <div className="mt-2 ml-5 flex items-start gap-2">
                            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <FileCode className="w-3 h-3 text-success" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-mono text-success truncate">{script.file_path}</p>
                              <pre className="text-[10px] font-mono text-muted-foreground mt-1 max-h-16 overflow-hidden whitespace-pre-wrap leading-relaxed">
                                {script.content.substring(0, 200)}{script.content.length > 200 ? "…" : ""}
                              </pre>
                            </div>
                          </div>
                        ) : tc.automation_eligible ? (
                          <div className="mt-2 ml-5 flex items-center gap-2 text-[10px] text-warning">
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <AlertTriangle className="w-3 h-3" />
                            <span>No Katalon script generated yet</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Automation Gaps */}
      {katalonScripts.length > 0 && automationEligible.length > automatedTcs.length && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-6 p-4 rounded-xl bg-warning/10 border border-warning/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-warning">
              Missing Automation Scripts ({automationEligible.length - automatedTcs.length})
            </h3>
          </div>
          <div className="space-y-1">
            {automationEligible
              .filter((tc) => !scriptByTcCode[tc.tc_code] && !scriptByTestCaseId[tc.id])
              .map((tc) => (
                <div key={tc.id} className="flex items-center gap-2 text-xs">
                  <XCircle className="w-3 h-3 text-warning shrink-0" />
                  <span className="font-mono text-warning">{tc.tc_code}</span>
                  <span className="text-foreground truncate">{tc.title}</span>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {requirements.length === 0 && (
        <div className="text-center text-muted-foreground text-sm mt-8">
          No requirements found. Upload sources and extract requirements first.
        </div>
      )}
    </div>
  );
};

export default TraceabilityMatrix;
