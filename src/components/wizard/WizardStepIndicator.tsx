import { Settings, Upload, Sparkles, Edit3, FileCode, Download } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

const steps = [
  { num: 1, label: "Project Setup", icon: Settings },
  { num: 2, label: "Uploaded Sources", icon: Upload },
  { num: 3, label: "Requirements", icon: Sparkles },
  { num: 4, label: "Test Cases", icon: Edit3 },
  { num: 5, label: "Katalon Scripts", icon: FileCode },
  { num: 6, label: "Test Results", icon: Download },
];

const WizardStepIndicator = ({ currentStep, onStepClick }: StepIndicatorProps) => {
  return (
    <div className="flex items-center gap-1 px-6 py-4 bg-card border-b border-border overflow-x-auto">
      {steps.map((step, i) => {
        const isActive = step.num === currentStep;
        const isCompleted = step.num < currentStep;
        const Icon = step.icon;

        return (
          <div key={step.num} className="flex items-center">
            <button
              onClick={() => onStepClick(step.num)}
              disabled={step.num > currentStep}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary/15 text-primary glow-primary"
                  : isCompleted
                  ? "bg-success/10 text-success hover:bg-success/20 cursor-pointer"
                  : "text-muted-foreground opacity-50 cursor-not-allowed"
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isActive ? "bg-primary text-primary-foreground" : isCompleted ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {isCompleted ? "✓" : step.num}
              </div>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`w-6 h-px mx-1 ${isCompleted ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WizardStepIndicator;
