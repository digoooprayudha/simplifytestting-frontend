import ProjectSelector from "@/components/ProjectSelector";
import ProjectSidebar from "@/components/ProjectSidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import WizardStepBar from "@/components/wizard/WizardStepBar";
import { useActiveGenerationJobs } from "@/hooks/useGenerationJobPoller";
import { useProjectFromUrl, useWizard } from "@/lib/wizardContext";
import { FileCode, Loader2, XCircle } from "lucide-react";
import { Outlet } from "react-router-dom";

const ProjectLayout = () => {
  useProjectFromUrl();
  const { projectId, projectSettings } = useWizard();
  const { activeJob, isRunning, cancelJob } = useActiveGenerationJobs(projectId);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ProjectSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-12 flex items-center gap-3 border-b border-border bg-card px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="w-px h-5 bg-border" />
            <span className="text-sm font-bold text-foreground truncate max-w-[200px]">
              {projectSettings.project_name || "SimplifyTesting"}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:inline">
              {projectSettings.base_url || ""}
            </span>
            <div className="w-px h-5 bg-border ml-2" />
            <ProjectSelector />
          </header>

          {/* Global generation status banner */}
          {isRunning && activeJob && (
            <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
              <FileCode className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-foreground font-medium">
                {activeJob.job_type === "requirements" ? "Requirement Extraction"
                  : (activeJob.job_type === "test_cases" || activeJob.job_type === "test_cases_pipeline") ? "Test Case Generation"
                  : "Katalon Generation"} Running
              </span>
              <span className="text-muted-foreground">
                {activeJob.completed_batches + activeJob.failed_batches}/{Math.max(activeJob.total_batches, activeJob.completed_batches + activeJob.failed_batches, 1)}
                {" • "}{activeJob.scripts_generated} {activeJob.job_type === "requirements" ? "requirements" : (activeJob.job_type === "test_cases" || activeJob.job_type === "test_cases_pipeline") ? "test cases" : "scripts"}
              </span>
              <Progress value={activeJob.percentage} className="h-1.5 w-32" />
              <span className="font-mono text-primary font-semibold">{activeJob.percentage}%</span>
              <Button size="sm" variant="ghost" onClick={cancelJob} className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive gap-1 ml-auto">
                <XCircle className="w-3 h-3" /> Cancel
              </Button>
            </div>
          )}

          {/* Wizard step bar */}
          <WizardStepBar />

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProjectLayout;
