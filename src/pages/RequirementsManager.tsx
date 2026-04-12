import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileSearch, Plus, Edit3, Trash2, Check, X, Download, Sparkles, RotateCcw, Search, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useWizard } from "@/lib/wizardContext";
import { apiClient } from "@/lib/apiClient";
import * as XLSX from "xlsx";
import TestCaseGenerationModal from "@/components/modals/TestCaseGenerationModal";
import RequirementGenerationModal from "@/components/modals/RequirementGenerationModal";
import ValidationModal from "@/components/modals/ValidationModal";
import { TestCasePagination } from "@/components/test-cases/TestCasePagination";

interface Requirement {
  id: string;
  req_code: string;
  title: string;
  description: string;
  priority: string;
  category: string | null;
  source_reference: string | null;
  document_id: string;
  project_id: string | null;
  created_at: string;
}

const priorityColors: Record<string, string> = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-warning/15 text-warning",
  low: "bg-success/15 text-success",
};

const RequirementsManager = () => {
  const { projectId, projectSettings } = useWizard();
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({ req_code: "", title: "", description: "", priority: "medium", category: "" });
  const [tcGenModalOpen, setTcGenModalOpen] = useState(false);
  const [reqGenModalOpen, setReqGenModalOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [docIds, setDocIds] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // View mode
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchRequirements(); }, [projectId]);

  const fetchRequirements = async () => {
    setLoading(true);
    if (!projectId) { setRequirements([]); setLoading(false); return; }
    try {
      const response = await apiClient.get<{ requirements: Requirement[] }>(`/projects/${projectId}/requirements`);
      setRequirements(response.requirements || []);
    } catch (error) {
      toast.error("Failed to load requirements");
    }
    setLoading(false);
  };

  // Categories derived from data
  const categories = useMemo(() => {
    const cats = new Set(requirements.map(r => r.category).filter(Boolean) as string[]);
    return ["all", ...cats];
  }, [requirements]);

  // Filtered
  const filtered = useMemo(() => {
    let result = requirements;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.req_code.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.source_reference || "").toLowerCase().includes(q)
      );
    }
    if (filterPriority !== "all") result = result.filter(r => r.priority === filterPriority);
    if (filterCategory !== "all") result = result.filter(r => r.category === filterCategory);
    return result;
  }, [requirements, search, filterPriority, filterCategory]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Reset page on filter change
  const updateSearch = useCallback((v: string) => { setSearch(v); setPage(1); setSelectedIds(new Set()); }, []);
  const updatePriority = useCallback((v: string) => { setFilterPriority(v); setPage(1); setSelectedIds(new Set()); }, []);
  const updateCategory = useCallback((v: string) => { setFilterCategory(v); setPage(1); setSelectedIds(new Set()); }, []);
  const updatePageSize = useCallback((size: number) => { setPageSize(size); setPage(1); setSelectedIds(new Set()); }, []);

  // Selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const toggleSelectAll = useCallback(() => {
    const ids = paginated.map(r => r.id);
    const allSelected = ids.every(id => selectedIds.has(id));
    if (allSelected) setSelectedIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; });
    else setSelectedIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; });
  }, [paginated, selectedIds]);

  const allOnPageSelected = paginated.length > 0 && paginated.every(r => selectedIds.has(r.id));

  // Bulk delete
  const bulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      await apiClient.post(`/projects/${projectId}/requirements/bulk-delete`, { requirement_ids: ids });
      setRequirements(prev => prev.filter(r => !ids.includes(r.id)));
      setSelectedIds(new Set());
      toast.success(`${ids.length} requirements deleted`);
    } catch (error) {
      toast.error("Bulk delete failed");
    }
  }, [selectedIds, projectId]);

  const hasActiveFilters = search || filterPriority !== "all" || filterCategory !== "all";
  const clearFilters = () => { setSearch(""); setFilterPriority("all"); setFilterCategory("all"); setPage(1); };

  const startEdit = (req: Requirement) => {
    setEditingId(req.id);
    setEditForm({ title: req.title, description: req.description, priority: req.priority, category: req.category || "", source_reference: req.source_reference || "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await apiClient.patch(`/requirements/${editingId}`, editForm);
      setRequirements(prev => prev.map(r => r.id === editingId ? { ...r, ...editForm } : r));
      setEditingId(null);
      toast.success("Requirement updated");
    } catch (error) {
      toast.error("Save failed");
    }
  };

  const deleteRequirement = async (id: string) => {
    try {
      await apiClient.delete(`/requirements/${id}`);
      setRequirements(prev => prev.filter(r => r.id !== id));
      toast.success("Requirement deleted");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleAdd = async () => {
    if (!addForm.title || !addForm.description) { toast.error("Title and description are required"); return; }
    try {
      const response = await apiClient.post<{ id: string }>(`/projects/${projectId}/requirements`, addForm);
      // Wait for a second so the background task (if any) or DB refresh is ready, or just add locally
      const newReq = { ...addForm, id: response.id, project_id: projectId, created_at: new Date().toISOString() } as unknown as Requirement;
      setRequirements(prev => [...prev, newReq]);
      setAddForm({ req_code: "", title: "", description: "", priority: "medium", category: "" });
      setAddDialogOpen(false);
      toast.success("Requirement added");
    } catch (error) {
      toast.error("Failed to add requirement");
    }
  };

  const downloadExcel = () => {
    const rows = requirements.map(r => ({ "REQ Code": r.req_code, "Title": r.title, "Description": r.description, "Priority": r.priority.toUpperCase(), "Category": r.category || "", "Source": r.source_reference || "" }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 50 }, { wch: 10 }, { wch: 18 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Requirements");
    XLSX.writeFile(wb, "SimplifyTesting_Requirements.xlsx");
    toast.success("Requirements exported!");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
              <FileSearch className="w-5 h-5 text-info" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Requirements</h1>
              <p className="text-sm text-muted-foreground">View, add, edit, and delete requirements</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setValidationOpen(true)} disabled={requirements.length === 0} className="gap-1"><Sparkles className="w-4 h-4" /> Validate</Button>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                // Fetch doc IDs via FastAPI project status (or just pass empty to trigger re-extraction)
                const status = await apiClient.get<{ doc_count: number }>(`/projects/${projectId}/status`);
                // We don't have a doc list endpoint, so pass empty array — backend will use all docs for project
                setDocIds([]);
                setReqGenModalOpen(true);
              } catch (_) {
                setDocIds([]);
                setReqGenModalOpen(true);
              }
            }} className="gap-1"><RotateCcw className="w-4 h-4" /> Recreate Reqs</Button>
            <Button size="sm" variant="outline" onClick={() => setTcGenModalOpen(true)} disabled={requirements.length === 0} className="gap-1"><Sparkles className="w-4 h-4" /> Create Test Cases</Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Add Requirement</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Requirement</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div><Label className="text-xs">Requirement Code (optional)</Label><Input placeholder="REQ_001" value={addForm.req_code} onChange={e => setAddForm({ ...addForm, req_code: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Title *</Label><Input placeholder="Requirement title" value={addForm.title} onChange={e => setAddForm({ ...addForm, title: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Description *</Label><Textarea placeholder="Detailed description..." value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} rows={3} className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Priority</Label>
                      <Select value={addForm.priority} onValueChange={v => setAddForm({ ...addForm, priority: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Category</Label><Input placeholder="e.g. Authentication" value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} className="mt-1" /></div>
                  </div>
                  <Button onClick={handleAdd} className="w-full">Add Requirement</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="outline" onClick={downloadExcel} disabled={requirements.length === 0} className="gap-1"><Download className="w-4 h-4" /> Export Excel</Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="mt-4 flex gap-3 flex-wrap items-center">
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-foreground">{requirements.length}</p>
        </div>
        {["high", "medium", "low"].map(p => (
          <div key={p} className="bg-card border border-border rounded-lg px-4 py-2">
            <p className="text-xs text-muted-foreground capitalize">{p}</p>
            <p className={`text-lg font-bold ${priorityColors[p]?.split(" ")[1] || "text-foreground"}`}>{requirements.filter(r => r.priority === p).length}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => updateSearch(e.target.value)} placeholder="Search requirements..." className="pl-9 h-8 text-sm" />
        </div>
        <Select value={filterPriority} onValueChange={updatePriority}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={updateCategory}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters} className="h-8 gap-1 text-xs text-muted-foreground"><X className="w-3 h-3" /> Clear</Button>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
          <button onClick={() => setViewMode("card")} className={`p-1.5 rounded-md transition-colors ${viewMode === "card" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setViewMode("table")} className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Select all + result count */}
      <div className="mt-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox checked={allOnPageSelected && paginated.length > 0} onCheckedChange={toggleSelectAll} />
          <span className="text-xs text-muted-foreground">Select all on page</span>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} results</span>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <Button size="sm" variant="destructive" onClick={bulkDelete} className="gap-1 h-7 text-xs"><Trash2 className="w-3 h-3" /> Delete Selected</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="h-7 text-xs">Clear</Button>
        </motion.div>
      )}

      {loading ? (
        <div className="mt-12 text-center text-muted-foreground">Loading...</div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(req => (
                <TableRow key={req.id} className={selectedIds.has(req.id) ? "bg-primary/5" : ""}>
                  <TableCell><Checkbox checked={selectedIds.has(req.id)} onCheckedChange={() => toggleSelect(req.id)} /></TableCell>
                  <TableCell className="text-xs font-mono text-primary">{req.req_code}</TableCell>
                  <TableCell className="text-sm">{req.title}</TableCell>
                  <TableCell><Badge className={`text-[10px] ${priorityColors[req.priority]}`}>{req.priority.toUpperCase()}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{req.category || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{req.source_reference || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(req)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteRequirement(req.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{requirements.length === 0 ? "No requirements yet." : "No requirements match filters."}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Card View */
        <div className="mt-4 space-y-3">
          {paginated.map((req, i) => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className={`rounded-xl bg-card border overflow-hidden ${selectedIds.has(req.id) ? "border-primary/50" : "border-border"}`}
            >
              {editingId === req.id ? (
                <div className="p-5 space-y-3">
                  <div><label className="text-xs text-muted-foreground">Title</label><Input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="text-sm mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">Description</label><Textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="text-sm mt-1" /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-muted-foreground">Priority</label>
                      <Select value={editForm.priority} onValueChange={v => setEditForm({ ...editForm, priority: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><label className="text-xs text-muted-foreground">Category</label><Input value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="mt-1" /></div>
                    <div><label className="text-xs text-muted-foreground">Source Reference</label><Input value={editForm.source_reference} onChange={e => setEditForm({ ...editForm, source_reference: e.target.value })} className="mt-1" /></div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={saveEdit}><Check className="w-3 h-3 mr-1" /> Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex items-start gap-3">
                  <Checkbox checked={selectedIds.has(req.id)} onCheckedChange={() => toggleSelect(req.id)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-primary">{req.req_code}</span>
                      <Badge className={`text-[10px] ${priorityColors[req.priority]}`}>{req.priority.toUpperCase()}</Badge>
                      {req.category && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{req.category}</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mt-1">{req.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                    {req.source_reference && <p className="text-[10px] text-muted-foreground/60 mt-2">Source: {req.source_reference}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(req)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteRequirement(req.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
          {paginated.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {requirements.length === 0 ? "No requirements yet. Upload documents or add manually." : "No requirements match the filters."}
            </div>
          )}
        </div>
      )}

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

      <TestCaseGenerationModal open={tcGenModalOpen} onOpenChange={setTcGenModalOpen} onComplete={() => { setTcGenModalOpen(false); navigate(`/project/${projectId}/test-cases`); }} />
      <RequirementGenerationModal open={reqGenModalOpen} onOpenChange={setReqGenModalOpen} documentIds={docIds} onComplete={() => { setReqGenModalOpen(false); fetchRequirements(); }} />
      {projectId && (
        <ValidationModal
          open={validationOpen}
          onOpenChange={setValidationOpen}
          artifactType="requirements"
          projectId={projectId}
          onAccepted={fetchRequirements}
        />
      )}
    </div>
  );
};

export default RequirementsManager;
