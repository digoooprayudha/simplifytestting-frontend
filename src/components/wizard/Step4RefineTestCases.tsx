import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Edit3, ArrowRight, Download, CheckCheck, Plus, LayoutGrid, List, ChevronsUpDown, FileCode, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useWizard } from "@/lib/wizardContext";
import * as XLSX from "xlsx";
import KatalonGenerationModal from "@/components/modals/KatalonGenerationModal";
import TestCaseGenerationModal from "@/components/modals/TestCaseGenerationModal";
import ValidationModal from "@/components/modals/ValidationModal";

import { useTestCasesState } from "@/components/test-cases/useTestCasesState";
import { TestCaseFilters } from "@/components/test-cases/TestCaseFilters";
import { TestCaseCardView } from "@/components/test-cases/TestCaseCardView";
import { TestCaseTableView } from "@/components/test-cases/TestCaseTableView";
import { TestCasePagination } from "@/components/test-cases/TestCasePagination";
import { BulkActionBar } from "@/components/test-cases/BulkActionBar";

const typeColors: Record<string, string> = {
  functional: "bg-primary/15 text-primary",
  ui: "bg-info/15 text-info",
  api: "bg-warning/15 text-warning",
  integration: "bg-success/15 text-success",
  boundary: "bg-destructive/15 text-destructive",
  negative: "bg-destructive/15 text-destructive",
  security: "bg-warning/15 text-warning",
  e2e: "bg-primary/15 text-primary",
};

const Step4RefineTestCases = () => {
  const { setCurrentStep } = useWizard();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const state = useTestCasesState(projectId);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [katalonModalOpen, setKatalonModalOpen] = useState(false);
  const [tcGenModalOpen, setTcGenModalOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    requirement_id: "", title: "", description: "", preconditions: "",
    steps: "", expected_result: "", priority: "medium", test_type: "functional",
    automation_eligible: true, module: "",
  });

  const handleAddTestCase = async () => {
    if (!addForm.title || !addForm.steps || !addForm.expected_result || !addForm.requirement_id) {
      return;
    }
    const ok = await state.addTestCase(addForm);
    if (ok) {
      setAddForm({
        requirement_id: "", title: "", description: "", preconditions: "",
        steps: "", expected_result: "", priority: "medium", test_type: "functional",
        automation_eligible: true, module: "",
      });
      setAddDialogOpen(false);
    }
  };

  const downloadExcel = () => {
    if (state.testCases.length === 0) return;
    const rows = state.testCases.map((tc, i) => ({
      "TC_ID": tc.tc_code || `ST_TC_${String(i + 1).padStart(3, "0")}`,
      "Requirement": tc.requirements?.req_code || "",
      "Module": tc.module || "",
      "Title": tc.title,
      "Description": tc.description || "",
      "Preconditions": tc.preconditions || "",
      "Test Steps": tc.steps,
      "Expected Result": tc.expected_result,
      "Priority": tc.priority?.toUpperCase(),
      "Test Type": (tc.test_type || "functional").toUpperCase(),
      "Test Level": (tc.test_level || "system").toUpperCase(),
      "Source": (tc as any).source || "BRD",
      "Source Ref": (tc as any).source_ref || "",
      "API Endpoint": (tc as any).api_endpoint || "",
      "Test Suite": (tc as any).test_suite || "Regression",
      "Automation Eligible": tc.automation_eligible ? "YES" : "NO",
      "Status": tc.status?.toUpperCase(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 35 }, { wch: 40 }, { wch: 30 }, { wch: 50 }, { wch: 40 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 12 }];

    // Summary sheet
    const summaryData = [
      { "Metric": "Total Test Cases", "Value": state.testCases.length },
      ...["functional", "ui", "api", "integration", "boundary", "negative", "security", "e2e"].map(t => ({
        "Metric": `${t.charAt(0).toUpperCase() + t.slice(1)} Tests`,
        "Value": state.testCases.filter(tc => tc.test_type === t).length,
      })),
      { "Metric": "Automation Eligible", "Value": state.testCases.filter(tc => tc.automation_eligible).length },
      { "Metric": "Generated Date", "Value": new Date().toISOString().split("T")[0] },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs["!cols"] = [{ wch: 25 }, { wch: 15 }];

    // Coverage Matrix sheet: Req → #TCs → TC IDs → test types
    const reqMap: Record<string, { req_code: string; tcs: typeof state.testCases }> = {};
    state.testCases.forEach(tc => {
      const reqCode = tc.requirements?.req_code || "Unknown";
      if (!reqMap[reqCode]) reqMap[reqCode] = { req_code: reqCode, tcs: [] };
      reqMap[reqCode].tcs.push(tc);
    });
    const coverageRows = Object.values(reqMap).map(({ req_code, tcs }) => {
      const types = [...new Set(tcs.map(tc => (tc.test_type || "functional").toUpperCase()))];
      const suites = [...new Set(tcs.map(tc => (tc as any).test_suite || "Regression"))];
      return {
        "Requirement": req_code,
        "# Test Cases": tcs.length,
        "TC IDs": tcs.map(tc => tc.tc_code).join(", "),
        "Test Types": types.join(", "),
        "Test Levels": [...new Set(tcs.map(tc => (tc.test_level || "system").toUpperCase()))].join(", "),
        "Suites": suites.join(", "),
        "Sources": [...new Set(tcs.map(tc => (tc as any).source || "BRD"))].join(", "),
      };
    });
    const coverageWs = XLSX.utils.json_to_sheet(coverageRows);
    coverageWs["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 50 }, { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
    XLSX.utils.book_append_sheet(wb, ws, "Test Cases");
    XLSX.utils.book_append_sheet(wb, coverageWs, "Coverage Matrix");
    XLSX.writeFile(wb, "SimplifyTesting_TestCases.xlsx");
  };

  const allOnPageSelected = state.paginatedCases.length > 0 && state.paginatedCases.every(tc => state.selectedIds.has(tc.id));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Refine Test Cases</h1>
              <p className="text-sm text-muted-foreground">Edit, add, remove, and approve test cases</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="w-4 h-4" /> Add</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Test Case</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label className="text-xs">Requirement *</Label>
                    <Select value={addForm.requirement_id} onValueChange={v => setAddForm({ ...addForm, requirement_id: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select requirement" /></SelectTrigger>
                      <SelectContent>
                        {state.requirements.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.req_code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Module</Label>
                      <Input value={addForm.module} onChange={e => setAddForm({ ...addForm, module: e.target.value })} placeholder="e.g. Login" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Title *</Label>
                      <Input value={addForm.title} onChange={e => setAddForm({ ...addForm, title: e.target.value })} placeholder="Test case title" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} rows={2} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Preconditions</Label>
                    <Textarea value={addForm.preconditions} onChange={e => setAddForm({ ...addForm, preconditions: e.target.value })} rows={2} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Steps *</Label>
                    <Textarea value={addForm.steps} onChange={e => setAddForm({ ...addForm, steps: e.target.value })} rows={3} className="mt-1 font-mono" placeholder="1. Navigate to...\n2. Click..." />
                  </div>
                  <div>
                    <Label className="text-xs">Expected Result *</Label>
                    <Textarea value={addForm.expected_result} onChange={e => setAddForm({ ...addForm, expected_result: e.target.value })} rows={2} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Priority</Label>
                      <Select value={addForm.priority} onValueChange={v => setAddForm({ ...addForm, priority: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={addForm.test_type} onValueChange={v => setAddForm({ ...addForm, test_type: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="functional">Functional</SelectItem>
                          <SelectItem value="ui">UI</SelectItem>
                          <SelectItem value="api">API</SelectItem>
                          <SelectItem value="boundary">Boundary</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="e2e">E2E</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <Switch checked={addForm.automation_eligible} onCheckedChange={v => setAddForm({ ...addForm, automation_eligible: v })} />
                      <span className="text-xs text-muted-foreground">Auto</span>
                    </div>
                  </div>
                  <Button onClick={handleAddTestCase} className="w-full">Add Test Case</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="outline" onClick={() => setValidationOpen(true)} disabled={state.testCases.length === 0} className="gap-1">
              <Sparkles className="w-4 h-4" /> Validate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTcGenModalOpen(true)} className="gap-1">
              <RotateCcw className="w-4 h-4" /> Recreate TCs
            </Button>
            <Button size="sm" variant="outline" onClick={() => setKatalonModalOpen(true)} disabled={state.stats.approved === 0} className="gap-1">
              <FileCode className="w-4 h-4" /> Create Katalon Scripts
            </Button>
            <Button size="sm" variant="outline" onClick={state.approveAll} className="gap-1">
              <CheckCheck className="w-4 h-4" /> Approve All
            </Button>
            <Button size="sm" onClick={downloadExcel} disabled={state.testCases.length === 0} className="gap-1">
              <Download className="w-4 h-4" /> Excel
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="mt-4 flex gap-3 flex-wrap items-center">
        {[
          { label: "Total", value: state.stats.total, color: "text-foreground" },
          { label: "Approved", value: state.stats.approved, color: "text-success" },
          { label: "Pending", value: state.stats.pending, color: "text-warning" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg px-4 py-2">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
        <div className="flex-1" />
        {/* Type breakdown badges */}
        <div className="flex flex-wrap gap-1">
          {Object.entries(
            state.testCases.reduce((acc, tc) => {
              const t = tc.test_type || "functional";
              acc[t] = (acc[t] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([type, count]) => (
            <Badge key={type} variant="secondary" className={`text-[10px] ${typeColors[type] || ""}`}>
              {type}: {count}
            </Badge>
          ))}
        </div>
      </div>

      {/* Filters + View toggle */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <TestCaseFilters
              filters={state.filters}
              updateFilter={state.updateFilter}
              testTypes={state.testTypes}
              requirements={state.requirements}
            />
          </div>
          <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
            <button
              onClick={() => state.setViewMode("card")}
              className={`p-1.5 rounded-md transition-colors ${state.viewMode === "card" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => state.setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors ${state.viewMode === "table" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Select all + expand controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allOnPageSelected && state.paginatedCases.length > 0}
              onCheckedChange={state.toggleSelectAll}
            />
            <span className="text-xs text-muted-foreground">Select all on page</span>
          </div>
          {state.viewMode === "card" && (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={state.expandAll}>
                <ChevronsUpDown className="w-3 h-3" /> Expand All
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={state.collapseAll}>
                Collapse All
              </Button>
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {state.filteredCases.length} result{state.filteredCases.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Content */}
      {state.loading ? (
        <div className="mt-12 text-center text-muted-foreground">Loading...</div>
      ) : state.filteredCases.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-foreground font-medium">No test cases found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {state.testCases.length > 0 ? "Try adjusting your filters" : "Generate test cases first"}
          </p>
        </div>
      ) : (
        <div className="mt-4">
          {state.viewMode === "card" ? (
            <TestCaseCardView
              testCases={state.paginatedCases}
              selectedIds={state.selectedIds}
              expandedIds={state.expandedIds}
              toggleSelect={state.toggleSelect}
              toggleExpand={state.toggleExpand}
              saveEdit={state.saveEdit}
              approveCase={state.approveCase}
              deleteCase={state.deleteCase}
            />
          ) : (
            <TestCaseTableView
              testCases={state.paginatedCases}
              selectedIds={state.selectedIds}
              expandedIds={state.expandedIds}
              toggleSelect={state.toggleSelect}
              toggleExpand={state.toggleExpand}
              approveCase={state.approveCase}
              deleteCase={state.deleteCase}
              onEdit={() => {/* table edit handled via card view for now */}}
            />
          )}
          <TestCasePagination
            page={state.page}
            totalPages={state.totalPages}
            pageSize={state.pageSize}
            totalItems={state.filteredCases.length}
            onPageChange={state.setPage}
            onPageSizeChange={state.updatePageSize}
          />
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        count={state.selectedIds.size}
        onApprove={state.bulkApprove}
        onDelete={state.bulkDelete}
        onChangeStatus={state.bulkChangeStatus}
        onClear={() => state.toggleSelectAll()}
      />

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => navigate(`/project/${projectId}/requirements`)}>← Requirements</Button>
        <Button onClick={() => { setCurrentStep(5); navigate(`/project/${projectId}/katalon`); }} disabled={state.stats.approved === 0} className="gap-2">
          Katalon Scripts <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <KatalonGenerationModal
        open={katalonModalOpen}
        onOpenChange={setKatalonModalOpen}
        onComplete={() => {
          setKatalonModalOpen(false);
          navigate(`/project/${projectId}/katalon`);
        }}
      />

      <TestCaseGenerationModal
        open={tcGenModalOpen}
        onOpenChange={setTcGenModalOpen}
        onComplete={() => {
          setTcGenModalOpen(false);
          state.fetchTestCases?.();
        }}
      />

      {projectId && (
        <ValidationModal
          open={validationOpen}
          onOpenChange={setValidationOpen}
          artifactType="test_cases"
          projectId={projectId}
          onAccepted={state.fetchTestCases}
        />
      )}
    </div>
  );
};

export default Step4RefineTestCases;
