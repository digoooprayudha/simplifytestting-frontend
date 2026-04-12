import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WizardProvider } from "@/lib/wizardContext";
import ProjectLayout from "@/components/ProjectLayout";
import LandingPage from "@/pages/LandingPage";
import Step2Upload from "@/components/wizard/Step2Upload";
import Step4RefineTestCases from "@/components/wizard/Step4RefineTestCases";
import Step6RefineAutomation from "@/components/wizard/Step6RefineAutomation";
import ProjectDashboard from "@/pages/ProjectDashboard";
import TraceabilityMatrix from "@/pages/TraceabilityMatrix";
import CoverageMatrix from "@/pages/CoverageMatrix";
import RequirementsManager from "@/pages/RequirementsManager";
import TestResults from "@/pages/TestResults";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <WizardProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/project/:projectId" element={<ProjectLayout />}>
              <Route index element={<ProjectDashboard />} />
              <Route path="traceability" element={<TraceabilityMatrix />} />
              <Route path="coverage" element={<CoverageMatrix />} />
              <Route path="documents" element={<Step2Upload />} />
              <Route path="requirements" element={<RequirementsManager />} />
              <Route path="test-cases" element={<Step4RefineTestCases />} />
              <Route path="katalon" element={<Step6RefineAutomation />} />
              <Route path="results" element={<TestResults />} />
              {/* Redirects for old routes */}
              <Route path="upload" element={<Navigate to="../documents" replace />} />
              <Route path="requirements/manage" element={<Navigate to="../requirements" replace />} />
              <Route path="automation" element={<Navigate to="../katalon" replace />} />
              <Route path="pipeline" element={<Navigate to="../results" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </WizardProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
