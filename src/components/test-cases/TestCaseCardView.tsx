﻿import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, Check, X, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { TestCase } from "./useTestCasesState";

const statusColors: Record<string, string> = {
  generated: "bg-info/20 text-info",
  refined: "bg-warning/20 text-warning",
  approved: "bg-success/20 text-success",
};

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

const levelColors: Record<string, string> = {
  system: "bg-muted text-muted-foreground",
  integration: "bg-info/15 text-info",
  uat: "bg-success/15 text-success",
};

interface Props {
  testCases: TestCase[];
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleExpand: (id: string) => void;
  saveEdit: (id: string, form: Record<string, any>) => Promise<boolean>;
  approveCase: (id: string) => void;
  deleteCase: (id: string) => void;
}

export const TestCaseCardView = ({
  testCases, selectedIds, expandedIds, toggleSelect, toggleExpand,
  saveEdit, approveCase, deleteCase,
}: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const startEdit = (tc: TestCase) => {
    setEditingId(tc.id);
    setEditForm({
      title: tc.title, description: tc.description || "", preconditions: tc.preconditions,
      steps: tc.steps, expected_result: tc.expected_result, priority: tc.priority,
      test_type: tc.test_type || "functional", automation_eligible: tc.automation_eligible ?? true,
      module: tc.module || "",
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    const ok = await saveEdit(editingId, editForm);
    if (ok) setEditingId(null);
  };

  return (
    <div className="space-y-2">
      {testCases.map((tc, i) => {
        const isExpanded = expandedIds.has(tc.id);
        const isEditing = editingId === tc.id;

        return (
          <motion.div
            key={tc.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.015 }}
            className="rounded-xl bg-card border border-border overflow-hidden"
          >
            {isEditing ? (
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Module</label>
                    <Input value={editForm.module} onChange={e => setEditForm({ ...editForm, module: e.target.value })} className="text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Title</label>
                    <Input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="text-sm mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <Textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Preconditions</label>
                  <Textarea value={editForm.preconditions} onChange={e => setEditForm({ ...editForm, preconditions: e.target.value })} rows={2} className="text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Steps</label>
                  <Textarea value={editForm.steps} onChange={e => setEditForm({ ...editForm, steps: e.target.value })} rows={4} className="text-sm font-mono mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Expected Result</label>
                  <Textarea value={editForm.expected_result} onChange={e => setEditForm({ ...editForm, expected_result: e.target.value })} rows={2} className="text-sm mt-1" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Priority</label>
                    <Select value={editForm.priority} onValueChange={v => setEditForm({ ...editForm, priority: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Type</label>
                    <Select value={editForm.test_type} onValueChange={v => setEditForm({ ...editForm, test_type: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="functional">Functional</SelectItem>
                        <SelectItem value="ui">UI</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="integration">Integration</SelectItem>
                        <SelectItem value="boundary">Boundary</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="e2e">E2E</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Switch checked={editForm.automation_eligible} onCheckedChange={v => setEditForm({ ...editForm, automation_eligible: v })} />
                    <span className="text-xs text-muted-foreground">Auto</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSave}><Check className="w-3 h-3 mr-1" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                {/* Collapsed header - always visible */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedIds.has(tc.id)}
                    onCheckedChange={() => toggleSelect(tc.id)}
                    onClick={e => e.stopPropagation()}
                  />
                  <button
                    onClick={() => toggleExpand(tc.id)}
                    className="flex-1 flex items-start gap-2 text-left min-w-0"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-primary">{tc.tc_code}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColors[tc.test_type || "functional"]}`}>
                          {(tc.test_type || "functional").toUpperCase()}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${levelColors[(tc as any).test_level || "system"]}`}>
                          {((tc as any).test_level || "system").toUpperCase()}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[tc.status]}`}>{tc.status}</span>
                        {(tc as any).test_suite && (tc as any).test_suite !== "Regression" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent-foreground">{(tc as any).test_suite}</span>
                        )}
                        {tc.automation_eligible && <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">⚡ Auto</span>}
                        {tc.requirements?.req_code && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tc.requirements.req_code}</span>}
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mt-1 truncate">{tc.title}</h3>
                    </div>
                  </button>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(tc)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => approveCase(tc.id)} title={tc.status === "approved" ? "Click to unapprove" : "Click to approve"} className={`p-1 rounded ${tc.status === "approved" ? "text-success bg-success/20 hover:bg-destructive/20 hover:text-destructive" : "text-muted-foreground hover:bg-success/20 hover:text-success"}`}>{tc.status === "approved" ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => deleteCase(tc.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 ml-9 grid grid-cols-1 gap-1.5 text-xs border-t border-border pt-3">
                        {tc.description && <div><span className="text-muted-foreground font-medium">Description:</span> <span className="text-foreground/80">{tc.description}</span></div>}
                        {tc.preconditions && <div><span className="text-muted-foreground font-medium">Pre:</span> <span className="text-foreground/80">{tc.preconditions}</span></div>}
                        <div><span className="text-muted-foreground font-medium">Steps:</span><pre className="text-foreground/80 font-mono whitespace-pre-wrap mt-0.5">{tc.steps}</pre></div>
                        <div><span className="text-muted-foreground font-medium">Expected:</span> <span className="text-foreground/80">{tc.expected_result}</span></div>
                        <div className="flex gap-3 mt-1 text-muted-foreground">
                          <span>Priority: <span className="text-foreground/80">{tc.priority}</span></span>
                          {tc.module && <span>Module: <span className="text-foreground/80">{tc.module}</span></span>}
                          {(tc as any).source && <span>Source: <span className="text-foreground/80">{(tc as any).source}</span></span>}
                          {(tc as any).source_ref && <span>Ref: <span className="text-foreground/80">{(tc as any).source_ref}</span></span>}
                          {(tc as any).api_endpoint && <span>Endpoint: <span className="text-foreground/80 font-mono">{(tc as any).api_endpoint}</span></span>}
                          {(tc as any).test_suite && <span>Suite: <span className="text-foreground/80">{(tc as any).test_suite}</span></span>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
