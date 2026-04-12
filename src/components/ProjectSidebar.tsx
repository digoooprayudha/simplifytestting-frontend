import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  FileSearch,
  ListChecks,
  FileCode,
  Download,
  GitBranch,
  Shield,
  RefreshCw,
  ChevronRight,
  Home,
  Brain,
  Plus,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { NavLink } from "@/components/NavLink";
import { useWizard } from "@/lib/wizardContext";
import logo from "@/assets/logo.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const ProjectSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { projectSettings, setProjectSettings, currentStep, refreshProgress, availableModels, getModelLabel, isKnownModel } = useWizard();

  // Refresh progress state whenever location changes to keep the sidebar clickable paths up to date without a hard refresh
  useEffect(() => {
    refreshProgress();
  }, [location.pathname]);

  const base = `/project/${projectId}`;

  const [customModelOpen, setCustomModelOpen] = useState(false);
  const [customForm, setCustomForm] = useState({ model_id: "", label: "", api_key: "", base_url: "", notes: "" });
  const [customModels, setCustomModels] = useState<Array<{ model_id: string; display_label: string }>>([]);
  const [saving, setSaving] = useState(false);

  // Custom models could be loaded via API if implemented, or we use a subset of settings
  useEffect(() => {
    if (!projectId) return;
    // For now we'll keep it simple or fetch from settings if available
    setCustomModels([]); 
  }, [projectId]);

  const handleModelChange = async (v: string) => {
    if (v === "__custom__") {
      setCustomForm({ model_id: "", label: "", api_key: "", base_url: "", notes: "" });
      setCustomModelOpen(true);
      return;
    }
    applyModel(v);
  };

  const applyModel = async (v: string) => {
    setProjectSettings({ ...projectSettings, ai_model: v });
    if (projectSettings.id) {
      try {
        await apiClient.patch(`/projects/${projectSettings.id}/settings`, { ai_model: v });
        const custom = customModels.find(m => m.model_id === v);
        toast.success(`Model → ${custom?.display_label || getModelLabel(v)}`);
      } catch (error) {
        toast.error("Failed to update model");
      }
    }
  };

  const handleCustomModelSave = async () => {
    const modelId = customForm.model_id.trim();
    const label = customForm.label.trim() || modelId;
    if (!modelId) return;

    setSaving(true);
    try {
      setCustomModels(prev => {
        const filtered = prev.filter(m => m.model_id !== modelId);
        return [...filtered, { model_id: modelId, display_label: label }];
      });
      setCustomModelOpen(false);
      applyModel(modelId);
      toast.success(`Custom model "${label}" added`);
    } catch (err) {
      toast.error("Failed to save custom model");
    } finally {
      setSaving(false);
    }
  };

  const navSections = [
    {
      label: "Overview",
      items: [
        { to: base, icon: LayoutDashboard, label: "Dashboard", end: true },
        { to: `${base}/traceability`, icon: GitBranch, label: "Traceability", end: true },
        { to: `${base}/coverage`, icon: Shield, label: "Coverage Matrix", end: true },
      ],
    },
    {
      label: "Workflow",
      items: [
        { to: `${base}/documents`, icon: Upload, label: "1. Uploaded Sources", step: 2 },
        { to: `${base}/requirements`, icon: FileSearch, label: "2. Requirements", step: 3 },
        { to: `${base}/test-cases`, icon: ListChecks, label: "3. Test Cases", step: 4 },
        { to: `${base}/katalon`, icon: FileCode, label: "4. Katalon Scripts", step: 5 },
        { to: `${base}/results`, icon: RefreshCw, label: "5. Test Results", step: 6 },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img src={logo} alt="SimplifyTesting" className="w-7 h-7 shrink-0" />
          {!collapsed && (
            <span className="text-sm font-semibold text-foreground tracking-tight truncate">SimplifyTesting</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
              {!collapsed && section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = item.end
                    ? location.pathname === item.to
                    : location.pathname.startsWith(item.to);
                  const stepReached = !item.step || item.step <= currentStep;

                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : stepReached
                              ? "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                              : "text-muted-foreground/40 pointer-events-none"
                          }`}
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {!collapsed && item.step && (
                            <span className={`ml-auto text-[10px] font-mono ${
                              item.step < currentStep
                                ? "text-success"
                                : item.step === currentStep
                                ? "text-primary"
                                : "text-muted-foreground/30"
                            }`}>
                              {item.step < currentStep ? "✓" : item.step}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        {!collapsed && (
          <>
            <div className="px-1">
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-1.5">
                <Brain className="w-3 h-3 text-primary" /> AI Model
              </label>
              <Select value={projectSettings.ai_model} onValueChange={handleModelChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue>{customModels.find(m => m.model_id === projectSettings.ai_model)?.display_label || getModelLabel(projectSettings.ai_model)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="text-xs">{m.label}</span>
                    </SelectItem>
                  ))}
                  {/* Custom models from database */}
                  {customModels.filter(m => !isKnownModel(m.model_id)).map((m) => (
                    <SelectItem key={m.model_id} value={m.model_id}>
                      <span className="text-xs">{m.display_label}</span>
                    </SelectItem>
                  ))}
                  {/* Fallback for unknown current model not in custom list */}
                  {!isKnownModel(projectSettings.ai_model) && projectSettings.ai_model && !customModels.some(m => m.model_id === projectSettings.ai_model) && (
                    <SelectItem value={projectSettings.ai_model}>
                      <span className="text-xs">{projectSettings.ai_model}</span>
                    </SelectItem>
                  )}
                  <SelectItem value="__custom__">
                    <span className="text-xs flex items-center gap-1 text-primary">
                      <Plus className="w-3 h-3" /> Add Custom Model
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>All Projects</span>
              <ChevronRight className="w-3 h-3 ml-auto" />
            </button>
          </>
        )}
      </SidebarFooter>

      {/* Custom Model Dialog */}
      <Dialog open={customModelOpen} onOpenChange={setCustomModelOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Custom AI Model</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-foreground">Model ID <span className="text-destructive">*</span></label>
              <Input
                placeholder="e.g., anthropic/claude-4 or openai/gpt-5"
                value={customForm.model_id}
                onChange={(e) => setCustomForm(f => ({ ...f, model_id: e.target.value }))}
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">The provider/model identifier used in API calls</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Display Label</label>
              <Input
                placeholder="e.g., Claude 4 Sonnet"
                value={customForm.label}
                onChange={(e) => setCustomForm(f => ({ ...f, label: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">API Key</label>
              <Input
                type="password"
                placeholder="sk-... or your provider API key"
                value={customForm.api_key}
                onChange={(e) => setCustomForm(f => ({ ...f, api_key: e.target.value }))}
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Stored securely. Required if not using Lovable AI gateway.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Base URL (Endpoint)</label>
              <Input
                placeholder="https://api.example.com/v1/chat/completions"
                value={customForm.base_url}
                onChange={(e) => setCustomForm(f => ({ ...f, base_url: e.target.value }))}
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Leave empty to use Lovable AI gateway</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Notes</label>
              <Input
                placeholder="Optional notes about this model"
                value={customForm.notes}
                onChange={(e) => setCustomForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCustomModelOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCustomModelSave} disabled={!customForm.model_id.trim() || saving}>
              {saving ? "Saving..." : "Add Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
};

export default ProjectSidebar;
