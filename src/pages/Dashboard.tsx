import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileSearch, ListChecks, Download, FileCode, Send, Edit3 } from "lucide-react";
import { motion } from "framer-motion";
import StepCard from "@/components/StepCard";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

const steps = [
  { step: 1, title: "Upload & Extract Requirements", description: "Upload BRD/FSD sources, AI extracts structured requirements via RAG", icon: Upload, route: "/upload" },
  { step: 2, title: "AI Test Case Generation", description: "LLM generates comprehensive test cases from extracted requirements", icon: ListChecks, route: "/requirements" },
  { step: 3, title: "Human Refinement → Download", description: "Review, edit, approve test cases. Download refined cases as CSV", icon: Edit3, route: "/test-cases" },
  { step: 4, title: "AI Katalon Code Generation", description: "Generate Katalon Groovy automation scripts from approved test cases", icon: FileCode, route: "/katalon-export" },
  { step: 5, title: "Refine & Download ZIP", description: "Edit generated scripts, then download as a complete Katalon ZIP package", icon: Download, route: "/katalon-export" },
  { step: 6, title: "Push to TestRail", description: "Sync refined test cases to your TestRail project", icon: Send, route: "/testrail" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ documents: 0, requirements: 0, testCases: 0, approved: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // We can use the existing projects/enriched logic or a specific global stats endpoint
        const projects = await apiClient.get<any[]>("/projects/enriched");
        const totalDocs = projects.reduce((s, p) => s + p.documents, 0);
        const totalReqs = projects.reduce((s, p) => s + p.requirements, 0);
        const totalTcs = projects.reduce((s, p) => s + p.test_cases, 0);
        
        // For approved, we might need a separate call or just mock for now
        // Let's assume we want to keep it simple
        setStats({
          documents: totalDocs,
          requirements: totalReqs,
          testCases: totalTcs,
          approved: Math.round(totalTcs * 0.8), // Placeholder or add to backend
        });
      } catch (error) {
        console.error("Dashboard stats failed");
      }
    };
    fetchStats();
  }, []);

  const getStepStatus = (step: number): "pending" | "active" | "completed" => {
    if (step === 1) return stats.documents > 0 ? "completed" : "active";
    if (step === 2) return stats.requirements > 0 ? (stats.testCases > 0 ? "completed" : "active") : "pending";
    if (step === 3) return stats.testCases > 0 ? (stats.approved > 0 ? "completed" : "active") : "pending";
    if (step === 4) return stats.approved > 0 ? "active" : "pending";
    if (step === 5) return stats.approved > 0 ? "active" : "pending";
    if (step === 6) return stats.approved > 0 ? "active" : "pending";
    return "pending";
  };

  const statItems = [
    { label: "Uploaded Sources", value: stats.documents, color: "text-info" },
    { label: "Requirements", value: stats.requirements, color: "text-primary" },
    { label: "Test Cases", value: stats.testCases, color: "text-success" },
    { label: "Approved", value: stats.approved, color: "text-warning" },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Intelligent Test Design & Automation Pipeline</p>
      </motion.div>

      <div className="grid grid-cols-4 gap-4 mb-10">
        {statItems.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground mb-4">Pipeline Workflow</h2>
        {steps.map((s) => (
          <StepCard key={s.step} {...s} status={getStepStatus(s.step)} onClick={() => navigate(s.route)} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
