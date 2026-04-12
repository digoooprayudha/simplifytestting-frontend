import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  project_name: string;
}

const defaultForm = {
  project_name: "",
  base_url: "",
  browser_type: "Chrome",
  locator_strategy: "id > css > xpath",
  naming_convention: "camelCase",
};

const ProjectSelector = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProjects = () => {
    apiClient.get<{ id: string; project_name: string }[]>("/projects/enriched")
      .then(data => setProjects(data.map(p => ({ id: p.id, project_name: p.project_name }))))
      .catch(() => {});
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleChange = (newProjectId: string) => {
    if (newProjectId === projectId) return;
    const currentSuffix = location.pathname.replace(`/project/${projectId}`, "");
    navigate(`/project/${newProjectId}${currentSuffix}`);
  };

  const handleCreate = async () => {
    if (!form.project_name || !form.base_url) {
      toast.error("Project name and base URL are required");
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
      fetchProjects();
      navigate(`/project/${data.id}/upload`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {projects.length > 0 && (
        <Select value={projectId} onValueChange={handleChange}>
          <SelectTrigger className="w-[200px] h-8 text-xs bg-card border-border">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.project_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            New Project
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Project Name *</Label>
              <Input
                placeholder="e.g. Banking Portal"
                value={form.project_name}
                onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Base URL *</Label>
              <Input
                placeholder="https://app.example.com"
                value={form.base_url}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Browser</Label>
                <Select value={form.browser_type} onValueChange={(v) => setForm({ ...form, browser_type: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Chrome">Chrome</SelectItem>
                    <SelectItem value="Edge">Edge</SelectItem>
                    <SelectItem value="Firefox">Firefox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Locator</Label>
                <Select value={form.locator_strategy} onValueChange={(v) => setForm({ ...form, locator_strategy: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id > css > xpath">id → css → xpath</SelectItem>
                    <SelectItem value="css > id > xpath">css → id → xpath</SelectItem>
                    <SelectItem value="xpath > css > id">xpath → css → id</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Naming</Label>
                <Select value={form.naming_convention} onValueChange={(v) => setForm({ ...form, naming_convention: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="camelCase">camelCase</SelectItem>
                    <SelectItem value="snake_case">snake_case</SelectItem>
                    <SelectItem value="PascalCase">PascalCase</SelectItem>
                    <SelectItem value="kebab-case">kebab-case</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? "Creating…" : "Create Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectSelector;
