import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle2, XCircle, AlertTriangle, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { useWizard } from "@/lib/wizardContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  test_level: string | null;
  status: string;
  priority: string;
  requirement_id: string;
}

const TEST_TYPE_COLUMNS = [
  { key: "functional", label: "Functional", color: "text-primary" },
  { key: "negative", label: "Negative", color: "text-destructive" },
  { key: "boundary", label: "Boundary", color: "text-warning" },
  { key: "validation", label: "Validation", color: "text-info" },
  { key: "ui", label: "UI", color: "text-accent" },
  { key: "api", label: "API", color: "text-success" },
  { key: "security", label: "Security", color: "text-warning" },
  { key: "e2e", label: "E2E", color: "text-primary" },
];

const LEVEL_OPTIONS = [
  { key: "all", label: "All Levels" },
  { key: "system", label: "System" },
  { key: "integration", label: "Integration" },
  { key: "uat", label: "UAT" },
];

const CoverageMatrix = () => {
  const { projectId } = useWizard();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) { setLoading(false); return; }
      try {
        const data = await apiClient.get<any>(`/projects/${projectId}/traceability`);
        setRequirements(data.requirements || []);
        setTestCases(data.test_cases || []);
      } catch (error) {
        console.error("Coverage fetch failed");
      }
      setLoading(false);
    };
    fetchData();
  }, [projectId]);

  // Build coverage data
  const { matrixData, activeTypes, stats } = useMemo(() => {
    // Filter by level
    const filtered = levelFilter === "all"
      ? testCases
      : testCases.filter(tc => (tc.test_level || "system") === levelFilter);

    const tcByReq: Record<string, TestCase[]> = {};
    filtered.forEach((tc) => {
      (tcByReq[tc.requirement_id] ||= []).push(tc);
    });

    const existingTypes = new Set<string>();
    filtered.forEach((tc) => existingTypes.add((tc.test_type || "functional").toLowerCase()));

    const activeTypes = TEST_TYPE_COLUMNS.filter((col) => existingTypes.has(col.key));

    const matrixData = requirements.map((req) => {
      const tcs = tcByReq[req.id] || [];
      const typeCounts: Record<string, number> = {};
      tcs.forEach((tc) => {
        const type = (tc.test_type || "functional").toLowerCase();
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      // Level distribution (always from unfiltered)
      const allTcsForReq = testCases.filter(tc => tc.requirement_id === req.id);
      const levelCounts: Record<string, number> = { system: 0, integration: 0, uat: 0 };
      allTcsForReq.forEach(tc => {
        const level = (tc.test_level || "system").toLowerCase();
        if (level in levelCounts) levelCounts[level]++;
      });

      return { req, tcs, typeCounts, totalCount: tcs.length, levelCounts };
    });

    const totalReqs = requirements.length;
    const coveredReqs = matrixData.filter((d) => d.totalCount > 0).length;
    const fullyCovered = matrixData.filter((d) => {
      const hasFuncAndNeg = (d.typeCounts["functional"] || 0) > 0 && (d.typeCounts["negative"] || 0) > 0;
      if (levelFilter !== "all") return hasFuncAndNeg;
      // Full coverage = func + neg + at least system AND uat
      return hasFuncAndNeg && d.levelCounts.system > 0 && d.levelCounts.uat > 0;
    }).length;
    const missingNegative = matrixData.filter((d) => d.totalCount > 0 && !(d.typeCounts["negative"] || 0)).length;
    const missingBoundary = matrixData.filter((d) => d.totalCount > 0 && !(d.typeCounts["boundary"] || 0)).length;
    const noCoverage = matrixData.filter((d) => d.totalCount === 0).length;

    return {
      matrixData,
      activeTypes,
      stats: {
        totalReqs,
        coveredReqs,
        fullyCovered,
        missingNegative,
        missingBoundary,
        noCoverage,
        coveragePercent: totalReqs > 0 ? Math.round((coveredReqs / totalReqs) * 100) : 0,
        fullCoveragePercent: totalReqs > 0 ? Math.round((fullyCovered / totalReqs) * 100) : 0,
      },
    };
  }, [requirements, testCases, levelFilter]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading coverage data…</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Coverage Matrix</h1>
            <p className="text-sm text-muted-foreground">Test type & level coverage per requirement</p>
          </div>
        </div>
      </motion.div>

      {/* Level Filter Toggle */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-muted/50 border border-border w-fit">
        {LEVEL_OPTIONS.map(opt => (
          <Button
            key={opt.key}
            size="sm"
            variant={levelFilter === opt.key ? "default" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setLevelFilter(opt.key)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="p-4 rounded-xl bg-card border border-border"
        >
          <p className="text-xs text-muted-foreground">Requirement Coverage</p>
          <p className={`text-2xl font-bold ${stats.coveragePercent === 100 ? "text-success" : stats.coveragePercent >= 80 ? "text-warning" : "text-destructive"}`}>
            {stats.coveragePercent}%
          </p>
          <Progress value={stats.coveragePercent} className="mt-2 h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">{stats.coveredReqs}/{stats.totalReqs} requirements with ≥1 test case</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-card border border-border"
        >
          <p className="text-xs text-muted-foreground">{levelFilter === "all" ? "Full Coverage (Type + Level)" : "Full Coverage (Func + Neg)"}</p>
          <p className={`text-2xl font-bold ${stats.fullCoveragePercent === 100 ? "text-success" : stats.fullCoveragePercent >= 70 ? "text-warning" : "text-destructive"}`}>
            {stats.fullCoveragePercent}%
          </p>
          <Progress value={stats.fullCoveragePercent} className="mt-2 h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {stats.fullyCovered}/{stats.totalReqs} {levelFilter === "all" ? "with func + neg + system + UAT" : "with both positive & negative"}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="p-4 rounded-xl bg-card border border-border"
        >
          <p className="text-xs text-muted-foreground">Gaps</p>
          <div className="flex items-baseline gap-3 mt-1">
            <div>
              <p className="text-lg font-bold text-destructive">{stats.noCoverage}</p>
              <p className="text-[10px] text-muted-foreground">No tests</p>
            </div>
            <div>
              <p className="text-lg font-bold text-warning">{stats.missingNegative}</p>
              <p className="text-[10px] text-muted-foreground">No negative</p>
            </div>
            <div>
              <p className="text-lg font-bold text-warning">{stats.missingBoundary}</p>
              <p className="text-[10px] text-muted-foreground">No boundary</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-card border border-border"
        >
          <p className="text-xs text-muted-foreground">Total Test Cases {levelFilter !== "all" ? `(${levelFilter})` : ""}</p>
          <p className="text-2xl font-bold text-foreground">
            {levelFilter === "all" ? testCases.length : testCases.filter(tc => (tc.test_level || "system") === levelFilter).length}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {activeTypes.map((t) => {
              const filtered = levelFilter === "all" ? testCases : testCases.filter(tc => (tc.test_level || "system") === levelFilter);
              const count = filtered.filter((tc) => (tc.test_type || "functional").toLowerCase() === t.key).length;
              return (
                <Badge key={t.key} variant="secondary" className={`text-[10px] ${t.color}`}>
                  {t.label}: {count}
                </Badge>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Coverage Matrix Table */}
      {requirements.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-xl border border-border overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-[10px] uppercase tracking-wider w-[100px]">Req Code</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider min-w-[200px]">Title</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider w-[60px] text-center">Priority</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider w-[50px] text-center">Total</TableHead>
                {activeTypes.map((t) => (
                  <TableHead key={t.key} className={`text-[10px] uppercase tracking-wider w-[70px] text-center ${t.color}`}>
                    {t.label}
                  </TableHead>
                ))}
                {levelFilter === "all" && (
                  <>
                    <TableHead className="text-[10px] uppercase tracking-wider w-[40px] text-center text-muted-foreground">SYS</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider w-[40px] text-center text-info">INT</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider w-[40px] text-center text-success">UAT</TableHead>
                  </>
                )}
                <TableHead className="text-[10px] uppercase tracking-wider w-[80px] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrixData.map((row) => {
                const hasFunctional = (row.typeCounts["functional"] || 0) > 0;
                const hasNegative = (row.typeCounts["negative"] || 0) > 0;
                const hasTypesCovered = hasFunctional && hasNegative;
                const hasLevelCoverage = row.levelCounts.system > 0 && row.levelCounts.uat > 0;
                const isFullyCovered = levelFilter === "all" ? hasTypesCovered && hasLevelCoverage : hasTypesCovered;
                const hasAnyCoverage = row.totalCount > 0;

                return (
                  <TableRow
                    key={row.req.id}
                    className={
                      !hasAnyCoverage
                        ? "bg-destructive/5"
                        : !isFullyCovered
                        ? "bg-warning/5"
                        : ""
                    }
                  >
                    <TableCell className="font-mono text-xs font-medium">{row.req.req_code}</TableCell>
                    <TableCell className="text-xs text-foreground max-w-[300px] truncate">{row.req.title}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          row.req.priority === "high"
                            ? "border-destructive/30 text-destructive"
                            : row.req.priority === "medium"
                            ? "border-warning/30 text-warning"
                            : "border-muted-foreground/30 text-muted-foreground"
                        }`}
                      >
                        {row.req.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs font-bold">{row.totalCount}</TableCell>
                    {activeTypes.map((t) => {
                      const count = row.typeCounts[t.key] || 0;
                      return (
                        <TableCell key={t.key} className="text-center">
                          {count > 0 ? (
                            <span className={`text-xs font-bold ${t.color}`}>{count}</span>
                          ) : (
                            <Minus className="w-3 h-3 text-muted-foreground/30 mx-auto" />
                          )}
                        </TableCell>
                      );
                    })}
                    {levelFilter === "all" && (
                      <>
                        <TableCell className="text-center">
                          {row.levelCounts.system > 0 ? (
                            <span className="text-xs font-bold text-muted-foreground">{row.levelCounts.system}</span>
                          ) : (
                            <Minus className="w-3 h-3 text-muted-foreground/30 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.levelCounts.integration > 0 ? (
                            <span className="text-xs font-bold text-info">{row.levelCounts.integration}</span>
                          ) : (
                            <Minus className="w-3 h-3 text-muted-foreground/30 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.levelCounts.uat > 0 ? (
                            <span className="text-xs font-bold text-success">{row.levelCounts.uat}</span>
                          ) : (
                            <Minus className="w-3 h-3 text-muted-foreground/30 mx-auto" />
                          )}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-center">
                      {!hasAnyCoverage ? (
                        <div className="flex items-center justify-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-destructive" />
                          <span className="text-[10px] text-destructive font-medium">None</span>
                        </div>
                      ) : isFullyCovered ? (
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                          <span className="text-[10px] text-success font-medium">Full</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                          <span className="text-[10px] text-warning font-medium">Partial</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>
      ) : (
        <div className="text-center text-muted-foreground text-sm mt-8">
          No requirements found. Upload sources and extract requirements first.
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> Full = Func + Neg {levelFilter === "all" ? "+ System + UAT" : ""}</div>
        <div className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-warning" /> Partial = missing coverage</div>
        <div className="flex items-center gap-1"><XCircle className="w-3 h-3 text-destructive" /> None = no test cases</div>
      </div>
    </div>
  );
};

export default CoverageMatrix;