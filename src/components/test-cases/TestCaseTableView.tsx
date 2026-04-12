import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit3, Check, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { TestCase } from "./useTestCasesState";

const statusColors: Record<string, string> = {
  generated: "text-info",
  refined: "text-warning",
  approved: "text-success",
};

interface Props {
  testCases: TestCase[];
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleExpand: (id: string) => void;
  approveCase: (id: string) => void;
  deleteCase: (id: string) => void;
  onEdit: (tc: TestCase) => void;
}

export const TestCaseTableView = ({
  testCases, selectedIds, expandedIds, toggleSelect, toggleExpand,
  approveCase, deleteCase, onEdit,
}: Props) => {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-10"></TableHead>
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-28 text-xs">TC Code</TableHead>
            <TableHead className="w-24 text-xs">Req</TableHead>
            <TableHead className="w-24 text-xs">Type</TableHead>
            <TableHead className="w-24 text-xs">Level</TableHead>
            <TableHead className="text-xs">Title</TableHead>
            <TableHead className="w-20 text-xs">Priority</TableHead>
            <TableHead className="w-20 text-xs">Source</TableHead>
            <TableHead className="w-24 text-xs">Suite</TableHead>
            <TableHead className="w-24 text-xs">Status</TableHead>
            <TableHead className="w-16 text-xs">Auto</TableHead>
            <TableHead className="w-24 text-xs">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {testCases.map(tc => {
            const isExpanded = expandedIds.has(tc.id);
            return (
              <TableRow key={tc.id} className="group" data-state={selectedIds.has(tc.id) ? "selected" : undefined}>
                <TableCell className="py-2">
                  <Checkbox checked={selectedIds.has(tc.id)} onCheckedChange={() => toggleSelect(tc.id)} />
                </TableCell>
                <TableCell className="py-2">
                  <button onClick={() => toggleExpand(tc.id)} className="text-muted-foreground hover:text-foreground">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </TableCell>
                <TableCell className="py-2 font-mono text-xs text-primary">{tc.tc_code}</TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">{tc.requirements?.req_code || "—"}</TableCell>
                <TableCell className="py-2 text-xs">{(tc.test_type || "functional").toUpperCase()}</TableCell>
                <TableCell className="py-2 text-xs capitalize">{(tc as any).test_level || "system"}</TableCell>
                <TableCell className="py-2">
                  <button onClick={() => toggleExpand(tc.id)} className="text-sm text-left text-foreground hover:text-primary transition-colors">
                    {tc.title}
                  </button>
                </TableCell>
                <TableCell className="py-2 text-xs capitalize">{tc.priority}</TableCell>
                <TableCell className="py-2 text-xs">{(tc as any).source || "BRD"}</TableCell>
                <TableCell className="py-2 text-xs">{(tc as any).test_suite || "Regression"}</TableCell>
                <TableCell className={`py-2 text-xs font-medium capitalize ${statusColors[tc.status] || ""}`}>{tc.status}</TableCell>
                <TableCell className="py-2 text-xs">{tc.automation_eligible ? "⚡" : "—"}</TableCell>
                <TableCell className="py-2">
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(tc)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Edit3 className="w-3.5 h-3.5" /></button>
                    {tc.status !== "approved" && <button onClick={() => approveCase(tc.id)} className="p-1 rounded hover:bg-success/20 text-muted-foreground hover:text-success"><Check className="w-3.5 h-3.5" /></button>}
                    <button onClick={() => deleteCase(tc.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {/* Expanded detail rows rendered separately */}
          {testCases.map(tc => expandedIds.has(tc.id) && (
            <TableRow key={`${tc.id}-detail`} className="bg-muted/20">
              <TableCell colSpan={13} className="py-3">
                <div className="ml-12 grid grid-cols-1 gap-1.5 text-xs">
                  {tc.description && <div><span className="text-muted-foreground font-medium">Description:</span> <span className="text-foreground/80">{tc.description}</span></div>}
                  {tc.preconditions && <div><span className="text-muted-foreground font-medium">Pre:</span> <span className="text-foreground/80">{tc.preconditions}</span></div>}
                  <div><span className="text-muted-foreground font-medium">Steps:</span><pre className="text-foreground/80 font-mono whitespace-pre-wrap mt-0.5">{tc.steps}</pre></div>
                  <div><span className="text-muted-foreground font-medium">Expected:</span> <span className="text-foreground/80">{tc.expected_result}</span></div>
                  <div className="flex gap-4 mt-1">
                    {(tc as any).source_ref && <span className="text-muted-foreground">Source Ref: <span className="text-foreground/80">{(tc as any).source_ref}</span></span>}
                    {(tc as any).api_endpoint && <span className="text-muted-foreground">Endpoint: <span className="text-foreground/80 font-mono">{(tc as any).api_endpoint}</span></span>}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
