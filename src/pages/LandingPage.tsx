import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, FolderOpen, FileText, ListChecks, BarChart3, Upload, ArrowRight, Settings, GitBranch, Trash2, Edit3, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import logo from "@/assets/logo.png";

interface ProjectWithStats {
  id: string;
  project_name: string;
  base_url: string;
  browser_type: string;
  locator_strategy: string;
  naming_convention: string;
  created_at: string;
  documents: number;
  requirements: number;
  testCases: number;
  katalonScripts: number;
}

const defaultForm = {
  project_name: "",
  base_url: "",
  browser_type: "Chrome",
  locator_strategy: "id > css > xpath",
  naming_convention: "camelCase",
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [globalStats, setGlobalStats] = useState({ projects: 0, requirements: 0, testCases: 0, katalonScripts: 0 });
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(defaultForm);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const enriched = await apiClient.get<ProjectWithStats[]>("/projects/enriched");
      // Map field names if they differ (camelCase vs snake_case) 
      // Backend test_cases -> frontend testCases, katalon_scripts -> katalonScripts
      const mapped = enriched.map(p => ({
        ...p,
        testCases: (p as any).test_cases || 0,
        katalonScripts: (p as any).katalon_scripts || 0
      }));
      
      setProjects(mapped);
      setGlobalStats({
        projects: mapped.length,
        requirements: mapped.reduce((s, p) => s + p.requirements, 0),
        testCases: mapped.reduce((s, p) => s + (p as any).testCases, 0),
        katalonScripts: mapped.reduce((s, p) => s + (p as any).katalonScripts, 0),
      });
    } catch (err: any) {
      toast.error("Failed to fetch project statistics");
    }
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async () => {
    if (!form.project_name || !form.base_url) {
      toast.error("Project Name and Base URL are required");
      return;
    }
    setSaving(true);
    try {
      const data = await apiClient.post<{ id: string }>("/projects", {
        project_name: form.project_name,
        base_url: form.base_url,
        browser_type: form.browser_type,
        locator_strategy: form.locator_strategy,
        naming_convention: form.naming_convention,
      });
      toast.success("Project created!");
      setDialogOpen(false);
      setForm(defaultForm);
      navigate(`/project/${data.id}/upload`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    }
    setSaving(false);
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/projects/${projectId}`);
      toast.success("Project deleted");
      fetchProjects();
    } catch (err: any) {
      // Fallback: backend may not have cascade delete yet, show error
      toast.error(err.message || "Failed to delete project");
    }
  };

  const startEditProject = (p: ProjectWithStats, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(p.id);
    setEditForm({
      project_name: p.project_name,
      base_url: p.base_url,
      browser_type: p.browser_type,
      locator_strategy: p.locator_strategy,
      naming_convention: p.naming_convention,
    });
  };

  const saveEditProject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingProjectId) return;
    try {
      await apiClient.patch(`/projects/${editingProjectId}/settings`, {
        project_name: editForm.project_name,
        base_url: editForm.base_url,
        browser_type: editForm.browser_type,
        locator_strategy: editForm.locator_strategy,
        naming_convention: editForm.naming_convention,
      });
      toast.success("Project updated");
      setEditingProjectId(null);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const summaryCards = [
    { label: "Projects", value: globalStats.projects, icon: FolderOpen, color: "text-primary" },
    { label: "Requirements", value: globalStats.requirements, icon: FileText, color: "text-info" },
    { label: "Test Cases", value: globalStats.testCases, icon: ListChecks, color: "text-warning" },
    { label: "Katalon Scripts", value: globalStats.katalonScripts, icon: GitBranch, color: "text-success" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SimplifyTesting" className="w-7 h-7" />
            <span className="text-sm font-bold text-foreground tracking-tight">SimplifyTesting</span>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" /> Create New Project
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs font-medium">Project Name *</Label>
                  <Input placeholder="e.g. MyApp Regression Suite" value={form.project_name}
                    onChange={(e) => setForm({ ...form, project_name: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Base URL *</Label>
                  <Input placeholder="https://app.example.com" value={form.base_url}
                    onChange={(e) => setForm({ ...form, base_url: e.target.value })} className="mt-1.5" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Browser</Label>
                    <Select value={form.browser_type} onValueChange={(v) => setForm({ ...form, browser_type: v })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Chrome">Chrome</SelectItem>
                        <SelectItem value="Edge">Edge</SelectItem>
                        <SelectItem value="Firefox">Firefox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Locators</Label>
                    <Select value={form.locator_strategy} onValueChange={(v) => setForm({ ...form, locator_strategy: v })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id > css > xpath">id → css → xpath</SelectItem>
                        <SelectItem value="css > id > xpath">css → id → xpath</SelectItem>
                        <SelectItem value="xpath > css > id">xpath → css → id</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Naming</Label>
                    <Select value={form.naming_convention} onValueChange={(v) => setForm({ ...form, naming_convention: v })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="camelCase">camelCase</SelectItem>
                        <SelectItem value="snake_case">snake_case</SelectItem>
                        <SelectItem value="PascalCase">PascalCase</SelectItem>
                        <SelectItem value="kebab-case">kebab-case</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleCreate} disabled={saving} className="gap-2">
                    {saving ? "Creating..." : "Create Project"} <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Global Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaryCards.map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-xl bg-card border border-border"
            >
              <c.icon className={`w-5 h-5 ${c.color} mb-3`} />
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Projects List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">All Projects</h2>
          <span className="text-xs text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Loading projects…</div>
        ) : projects.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 rounded-xl border border-dashed border-border"
          >
            <FolderOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No projects yet. Create your first project to get started.</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Create Project
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {projects.map((p, i) => {
              const coverage = p.requirements > 0 ? Math.round(
                ((p.testCases > 0 ? Math.min(p.testCases, p.requirements) : 0) / p.requirements) * 100
              ) : 0;
              const isEditing = editingProjectId === p.id;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="w-full p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all text-left"
                >
                  {isEditing ? (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Project Name</Label>
                          <Input value={editForm.project_name} onChange={(e) => setEditForm({ ...editForm, project_name: e.target.value })} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Base URL</Label>
                          <Input value={editForm.base_url} onChange={(e) => setEditForm({ ...editForm, base_url: e.target.value })} className="mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Browser</Label>
                          <Select value={editForm.browser_type} onValueChange={(v) => setEditForm({ ...editForm, browser_type: v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Chrome">Chrome</SelectItem>
                              <SelectItem value="Edge">Edge</SelectItem>
                              <SelectItem value="Firefox">Firefox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Locators</Label>
                          <Select value={editForm.locator_strategy} onValueChange={(v) => setEditForm({ ...editForm, locator_strategy: v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="id > css > xpath">id → css → xpath</SelectItem>
                              <SelectItem value="css > id > xpath">css → id → xpath</SelectItem>
                              <SelectItem value="xpath > css > id">xpath → css → id</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Naming</Label>
                          <Select value={editForm.naming_convention} onValueChange={(v) => setEditForm({ ...editForm, naming_convention: v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="camelCase">camelCase</SelectItem>
                              <SelectItem value="snake_case">snake_case</SelectItem>
                              <SelectItem value="PascalCase">PascalCase</SelectItem>
                              <SelectItem value="kebab-case">kebab-case</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEditProject} className="gap-1"><Check className="w-3 h-3" /> Save</Button>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingProjectId(null); }}><X className="w-3 h-3 mr-1" /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => navigate(`/project/${p.id}`)} className="w-full text-left">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-foreground">{p.project_name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.base_url}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={(e) => startEditProject(p, e)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit project">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete project">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{p.project_name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the project and all its documents, requirements, test cases, and generated code. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => handleDeleteProject(p.id, e)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Badge variant="outline" className="text-[10px]">{p.browser_type}</Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-4 mt-4">
                        <div>
                          <p className="text-lg font-bold text-foreground">{p.documents}</p>
                          <p className="text-[10px] text-muted-foreground">Documents</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">{p.requirements}</p>
                          <p className="text-[10px] text-muted-foreground">Requirements</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">{p.testCases}</p>
                          <p className="text-[10px] text-muted-foreground">Test Cases</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">{p.katalonScripts}</p>
                          <p className="text-[10px] text-muted-foreground">Katalon Scripts</p>
                        </div>
                        <div>
                          <p className={`text-lg font-bold ${coverage === 100 ? "text-success" : coverage > 0 ? "text-warning" : "text-muted-foreground"}`}>{coverage}%</p>
                          <p className="text-[10px] text-muted-foreground">Coverage</p>
                          <Progress value={coverage} className="h-1 mt-1" />
                        </div>
                      </div>
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
