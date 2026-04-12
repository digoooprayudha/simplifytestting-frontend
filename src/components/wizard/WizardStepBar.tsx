import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useWizard } from "@/lib/wizardContext";

const steps = [
  { num: 2, label: "Uploaded Sources", suffix: "/upload" },
  { num: 3, label: "Requirements", suffix: "/requirements" },
  { num: 4, label: "Test Cases", suffix: "/test-cases" },
  { num: 5, label: "Katalon Scripts", suffix: "/katalon" },
  { num: 6, label: "Test Results", suffix: "/automation" },
];

const WizardStepBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentStep } = useWizard();
  const base = `/project/${projectId}`;

  // Determine active step from path
  let activeStep = 0;
  for (const step of steps) {
    if (location.pathname.startsWith(`${base}${step.suffix}`)) {
      activeStep = step.num;
      break;
    }
  }

  return (
    <div className="flex items-center gap-0.5 px-4 py-2 bg-card/50 border-b border-border">
      {steps.map((step, i) => {
        const isActive = step.num === activeStep;
        const isReached = step.num <= currentStep;
        const isCompleted = step.num < currentStep;

        return (
          <div key={step.num} className="flex items-center">
            <button
              onClick={() => isReached && navigate(`${base}${step.suffix}`)}
              disabled={!isReached}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : isCompleted
                  ? "text-success hover:bg-success/10 cursor-pointer"
                  : isReached
                  ? "text-muted-foreground hover:bg-muted/50 cursor-pointer"
                  : "text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                isActive ? "bg-primary text-primary-foreground" : isCompleted ? "bg-success/20 text-success" : "bg-muted text-muted-foreground/40"
              }`}>
                {isCompleted ? "✓" : step.num}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`w-4 h-px mx-0.5 ${isCompleted ? "bg-success/40" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WizardStepBar;
