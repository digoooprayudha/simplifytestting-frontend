import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, ArrowRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { useWizard } from "@/lib/wizardContext";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const Step1ProjectSetup = () => {
  const { projectSettings, setProjectSettings, setProjectId, setCurrentStep, availableModels } = useWizard();
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSave = async () => {
    if (!projectSettings.project_name || !projectSettings.base_url) {
      toast.error("Project Name and Base URL are required");
      return;
    }
    setSaving(true);
    try {
      const data = await apiClient.post<any>("/projects", {
        project_name: projectSettings.project_name,
        base_url: projectSettings.base_url,
        browser_type: projectSettings.browser_type,
        locator_strategy: projectSettings.locator_strategy,
        naming_convention: projectSettings.naming_convention,
        ai_model: projectSettings.ai_model,
      });
      
      setProjectId(data.id);
      setCurrentStep(2);
      toast.success("Project created!");
      navigate(`/project/${data.id}/upload`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <img src={logo} alt="SimplifyTesting" className="w-14 h-14 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground tracking-tight">SimplifyTesting</h1>
          <p className="text-sm text-muted-foreground mt-2">Intelligent Test Design & Automation Platform</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-6 rounded-xl bg-card border border-border space-y-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">New Project</h2>
          </div>

          <div>
            <Label className="text-xs font-medium">Project Name *</Label>
            <Input
              placeholder="e.g. MyApp Regression Suite"
              value={projectSettings.project_name}
              onChange={(e) => setProjectSettings({ ...projectSettings, project_name: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-xs font-medium">Base URL *</Label>
            <Input
              placeholder="https://app.example.com"
              value={projectSettings.base_url}
              onChange={(e) => setProjectSettings({ ...projectSettings, base_url: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium">Browser</Label>
              <Select
                value={projectSettings.browser_type}
                onValueChange={(v) => setProjectSettings({ ...projectSettings, browser_type: v as any })}
              >
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
              <Select
                value={projectSettings.locator_strategy}
                onValueChange={(v) => setProjectSettings({ ...projectSettings, locator_strategy: v })}
              >
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
              <Select
                value={projectSettings.naming_convention}
                onValueChange={(v) => setProjectSettings({ ...projectSettings, naming_convention: v as any })}
              >
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

          {/* AI Model Selection */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-primary" /> AI Model
            </Label>
            <Select
              value={projectSettings.ai_model}
              onValueChange={(v) => setProjectSettings({ ...projectSettings, ai_model: v })}
            >
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableModels.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex flex-col">
                      <span>{m.label}</span>
                      <span className="text-[10px] text-muted-foreground">{m.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
            {saving ? "Creating..." : "Create Project"} <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Step1ProjectSetup;
