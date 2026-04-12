import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, ListChecks, FileCode, Upload, BarChart3, GitBranch, CheckCircle2, XCircle, Sparkles, Download, ExternalLink, ArrowRight } from "lucide-react";
import { useWizard } from "@/lib/wizardContext";
import { useNavigate, useParams } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

const ProjectDashboard = () => {
  const { projectId, projectSettings } = useWizard();
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const [stats, setStats] = useState({ documents: 0, requirements: 0, testCases: 0, katalonScripts: 0, testRuns: 0 });
  const [coverage, setCoverage] = useState({ covered: 0, total: 0, percent: 0 });
  const [automationCoverage, setAutomationCoverage] = useState({ scripted: 0, eligible: 0, percent: 0 });
  const [testCaseReadiness, setTestCaseReadiness] = useState({ approved: 0, total: 0, percent: 0 });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      try {
        const d = await apiClient.get<any>(`/projects/${projectId}/dashboard-stats`);
        
        setStats({
          documents: d.documents,
          requirements: d.requirements,
          testCases: d.test_cases,
          katalonScripts: d.katalon_scripts,
          testRuns: d.test_runs,
        });

        setCoverage({ 
          covered: Math.round((d.coverage_percent / 100) * d.total_requirements), 
          total: d.total_requirements, 
          percent: d.coverage_percent 
        });

        setAutomationCoverage({ 
          scripted: 0, // Simplified for now as backend returns percent
          eligible: 0, 
          percent: d.automation_percent 
        });

        setTestCaseReadiness({ 
          approved: d.approved_count, 
          total: d.test_cases, 
          percent: d.readiness_percent 
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats");
      }
    };
    fetchData();
  }, [projectId, refreshKey]);

  // 5-step workflow data
  const workflowSteps = [
    {
      step: 1,
      label: "Uploaded Sources",
      description: "Upload BRD, FSD, Figma, source code",
      icon: Upload,
      count: stats.documents,
      done: stats.documents > 0,
      route: `/project/${urlProjectId}/documents`,
      color: "text-primary",
      bgColor: "bg-primary/15",
    },
    {
      step: 2,
      label: "Requirements",
      description: "AI-extracted & categorized requirements",
      icon: FileText,
      count: stats.requirements,
      done: stats.requirements > 0,
      route: `/project/${urlProjectId}/requirements`,
      color: "text-info",
      bgColor: "bg-info/15",
    },
    {
      step: 3,
      label: "Test Cases",
      description: "Multi-level test case generation",
      icon: ListChecks,
      count: stats.testCases,
      done: stats.testCases > 0,
      route: `/project/${urlProjectId}/test-cases`,
      color: "text-warning",
      bgColor: "bg-warning/15",
    },
    {
      step: 4,
      label: "Katalon Scripts",
      description: "Automation scripts & object repository",
      icon: FileCode,
      count: stats.katalonScripts,
      done: stats.katalonScripts > 0,
      route: `/project/${urlProjectId}/katalon`,
      color: "text-success",
      bgColor: "bg-success/15",
    },
    {
      step: 5,
      label: "Test Results",
      description: "CI/CD execution & run history",
      icon: BarChart3,
      count: stats.testRuns,
      done: stats.testRuns > 0,
      route: `/project/${urlProjectId}/results`,
      color: "text-accent-foreground",
      bgColor: "bg-accent/50",
    },
  ];

  // Find current active step (first incomplete)
  const activeStepIndex = workflowSteps.findIndex(s => !s.done);
  const currentStep = activeStepIndex === -1 ? workflowSteps.length : activeStepIndex;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {projectSettings.browser_type} · {projectSettings.locator_strategy}
        </p>
      </motion.div>

      {/* 5-Step Visual Workflow Progress */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mt-8 p-6 rounded-2xl bg-card border border-border"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-foreground">Workflow Progress</h3>
          <span className="text-xs text-muted-foreground">
            {workflowSteps.filter(s => s.done).length} of {workflowSteps.length} steps complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative mb-8">
          <div className="h-1.5 bg-muted rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(workflowSteps.filter(s => s.done).length / workflowSteps.length) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-success rounded-full"
            />
          </div>

          {/* Step nodes on the bar */}
          <div className="absolute -top-2.5 left-0 right-0 flex justify-between">
            {workflowSteps.map((s, i) => (
              <motion.button
                key={s.step}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                onClick={() => navigate(s.route)}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all cursor-pointer ${
                  s.done
                    ? "bg-success border-success text-success-foreground"
                    : i === currentStep
                    ? "bg-primary border-primary text-primary-foreground animate-pulse"
                    : "bg-muted border-border text-muted-foreground"
                }`}
                title={s.label}
              >
                {s.done ? "✓" : s.step}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-5 gap-3">
          {workflowSteps.map((s, i) => (
            <motion.button
              key={s.step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              onClick={() => navigate(s.route)}
              className={`relative p-3 rounded-xl text-left transition-all group ${
                s.done
                  ? "bg-success/5 border border-success/20 hover:border-success/40"
                  : i === currentStep
                  ? "bg-primary/5 border border-primary/30 hover:border-primary/50 ring-1 ring-primary/20"
                  : "bg-muted/30 border border-border hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.done ? "bg-success/15" : s.bgColor}`}>
                  <s.icon className={`w-3.5 h-3.5 ${s.done ? "text-success" : s.color}`} />
                </div>
                {s.count > 0 && (
                  <span className="text-xs font-bold text-foreground">{s.count}</span>
                )}
              </div>
              <p className={`text-xs font-semibold ${s.done ? "text-success" : i === currentStep ? "text-primary" : "text-muted-foreground"}`}>
                {s.label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
              {i === currentStep && !s.done && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-primary">
                  Start <ArrowRight className="w-3 h-3" />
                </div>
              )}
              {s.done && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-success opacity-0 group-hover:opacity-100 transition-opacity">
                  View <ExternalLink className="w-3 h-3" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Coverage Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Requirement Coverage */}
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          onClick={() => navigate(`/project/${urlProjectId}/traceability`)}
          className="w-full p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Requirement Coverage</span>
            </div>
            <span className={`text-xl font-bold ${
              coverage.percent === 100 ? "text-success" : coverage.percent >= 70 ? "text-warning" : "text-destructive"
            }`}>{coverage.percent}%</span>
          </div>
          <Progress value={coverage.percent} className="h-1.5 mb-2" />
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> {coverage.covered} covered</span>
            <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-destructive" /> {coverage.total - coverage.covered} gaps</span>
          </div>
        </motion.button>

        {/* Test Case Readiness */}
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          onClick={() => navigate(`/project/${urlProjectId}/test-cases`)}
          className="w-full p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-warning" />
              <span className="text-xs font-semibold text-foreground">Test Case Readiness</span>
            </div>
            <span className={`text-xl font-bold ${
              testCaseReadiness.percent === 100 ? "text-success" : testCaseReadiness.percent >= 70 ? "text-warning" : testCaseReadiness.percent > 0 ? "text-primary" : "text-muted-foreground"
            }`}>{testCaseReadiness.percent}%</span>
          </div>
          <Progress value={testCaseReadiness.percent} className="h-1.5 mb-2" />
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> {testCaseReadiness.approved} approved</span>
            <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-warning" /> {testCaseReadiness.total - testCaseReadiness.approved} pending</span>
          </div>
        </motion.button>

        {/* Automation Coverage */}
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.41 }}
          onClick={() => navigate(`/project/${urlProjectId}/traceability`)}
          className="w-full p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-success" />
              <span className="text-xs font-semibold text-foreground">Automation Coverage</span>
            </div>
            <span className={`text-xl font-bold ${
              automationCoverage.percent === 100 ? "text-success" : automationCoverage.percent >= 70 ? "text-warning" : automationCoverage.percent > 0 ? "text-primary" : "text-muted-foreground"
            }`}>{automationCoverage.percent}%</span>
          </div>
          <Progress value={automationCoverage.percent} className="h-1.5 mb-2" />
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> {automationCoverage.scripted} scripted</span>
            <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-warning" /> {automationCoverage.eligible - automationCoverage.scripted} missing</span>
          </div>
        </motion.button>
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="mt-4 p-5 rounded-xl bg-card border border-border"
      >
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          <Button variant="outline" className="gap-2 text-xs h-auto py-3 flex-col" onClick={() => navigate(`/project/${urlProjectId}/documents`)}>
            <Upload className="w-4 h-4 text-primary" />
            Upload Sources
          </Button>
          <Button variant="outline" className="gap-2 text-xs h-auto py-3 flex-col" onClick={() => navigate(`/project/${urlProjectId}/requirements`)}>
            <Sparkles className="w-4 h-4 text-info" />
            Generate Test Cases
          </Button>
          <Button variant="outline" className="gap-2 text-xs h-auto py-3 flex-col" onClick={() => navigate(`/project/${urlProjectId}/katalon`)}>
            <FileCode className="w-4 h-4 text-success" />
            Katalon Scripts
          </Button>
          <Button variant="outline" className="gap-2 text-xs h-auto py-3 flex-col" onClick={() => navigate(`/project/${urlProjectId}/results`)}>
            <BarChart3 className="w-4 h-4 text-warning" />
            Test Results
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProjectDashboard;
