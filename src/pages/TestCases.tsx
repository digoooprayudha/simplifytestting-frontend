import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ListChecks, RefreshCw, Download, CheckCheck, LayoutGrid, List, ChevronsUpDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { useTestCasesState } from "@/components/test-cases/useTestCasesState";
import { TestCaseFilters } from "@/components/test-cases/TestCaseFilters";
import { TestCaseCardView } from "@/components/test-cases/TestCaseCardView";
import { TestCaseTableView } from "@/components/test-cases/TestCaseTableView";
import { TestCasePagination } from "@/components/test-cases/TestCasePagination";
import { BulkActionBar } from "@/components/test-cases/BulkActionBar";
import { useWizard } from "@/lib/wizardContext";
import ValidationModal from "@/components/modals/ValidationModal";

const TestCases = () => {
  const { projectId } = useWizard();
  const navigate = useNavigate();
  const state = useTestCasesState(projectId || undefined);
  const [validationOpen, setValidationOpen] = useState(false);
  const allOnPageSelected = state.paginatedCases.length > 0 && state.paginatedCases.every(tc => state.selectedIds.has(tc.id));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Test Cases</h1>
            <p className="text-muted-foreground mt-2">Review, refine, and approve AI-generated test cases</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setValidationOpen(true)} disabled={state.testCases.length === 0} className="gap-2">
              <Sparkles className="w-4 h-4" /> Validate
            </Button>
            <Button size="sm" variant="outline" onClick={state.fetchTestCases} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            {state.testCases.length > 0 && (
              <Button size="sm" variant="outline" onClick={state.approveAll} className="gap-2">
                <CheckCheck className="w-4 h-4" /> Approve All
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {state.testCases.length > 0 && (
        <div className="mt-6 flex gap-4">
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
        </div>
      )}

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={allOnPageSelected && state.paginatedCases.length > 0} onCheckedChange={state.toggleSelectAll} />
            <span className="text-xs text-muted-foreground">Select all on page</span>
          </div>
          {state.viewMode === "card" && (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={state.expandAll}>
                <ChevronsUpDown className="w-3 h-3" /> Expand All
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={state.collapseAll}>Collapse All</Button>
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{state.filteredCases.length} results</span>
        </div>
      </div>

      {state.loading ? (
        <div className="mt-16 text-center text-muted-foreground">Loading...</div>
      ) : state.testCases.length === 0 ? (
        <div className="mt-16 text-center">
          <ListChecks className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-foreground font-medium">No test cases yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Extract requirements first, then generate test cases from the Requirements page.</p>
          <Button size="sm" variant="outline" onClick={() => navigate(`/project/${projectId}/requirements`)} className="gap-2">
            Go to Requirements
          </Button>
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
              onEdit={() => {}}
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

      <BulkActionBar
        count={state.selectedIds.size}
        onApprove={state.bulkApprove}
        onDelete={state.bulkDelete}
        onChangeStatus={state.bulkChangeStatus}
        onClear={() => state.toggleSelectAll()}
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

export default TestCases;
