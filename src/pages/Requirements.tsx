import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileSearch, ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { useWizard } from "@/lib/wizardContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Requirement = Tables<"requirements">;

const priorityColors: Record<string, string> = {
  high: "bg-destructive/20 text-destructive",
  medium: "bg-warning/20 text-warning",
  low: "bg-info/20 text-info",
};

const Requirements = () => {
  const { projectId } = useWizard();
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    if (!projectId) return;
    try {
      const data = await apiClient.get<any>(`/projects/${projectId}/traceability`);
      setRequirements(data.requirements || []);
    } catch (error) {
      toast.error("Failed to load requirements");
    }
    setLoading(false);
  };

  const generateTestCases = async () => {
    if (!projectId || requirements.length === 0) return;
    setGenerating(true);
    try {
      const response = await apiClient.post<any>("/pipelines/trigger-run", { project_id: projectId });
      if (response.error) throw new Error(response.error);
      toast.success("Test cases generation triggered!");
      navigate(`/project/${projectId}/test-cases`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate test cases");
    }
    setGenerating(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Extracted Requirements</h1>
            <p className="text-muted-foreground mt-2">AI-extracted requirements from uploaded documents</p>
          </div>
          {requirements.length > 0 && (
            <Button onClick={generateTestCases} disabled={generating} size="sm" className="gap-2">
              <Sparkles className="w-4 h-4" />
              {generating ? "Generating..." : "Generate Test Cases"}
            </Button>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="mt-16 text-center text-muted-foreground">Loading...</div>
      ) : requirements.length === 0 ? (
        <div className="mt-16 text-center">
          <FileSearch className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-foreground font-medium">No requirements extracted yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Upload documents first, then extract requirements using AI.</p>
          <Button size="sm" variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ChevronRight className="w-4 h-4 rotate-180" /> Go to Upload Documents
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {requirements.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-primary">{req.req_code}</span>
                    {req.category && <Badge variant="outline" className="text-xs">{req.category}</Badge>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[req.priority] || ""}`}>
                      {req.priority}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{req.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
                  {req.source_reference && (
                    <p className="text-xs text-muted-foreground/60 mt-2 font-mono">Source: {req.source_reference}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Requirements;
