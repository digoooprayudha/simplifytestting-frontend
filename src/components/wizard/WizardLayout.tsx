import { WizardProvider, useWizard } from "@/lib/wizardContext";
import WizardStepIndicator from "./WizardStepIndicator";
import Step1ProjectSetup from "./Step1ProjectSetup";
import Step2Upload from "./Step2Upload";
import Step3GenerateTestCases from "./Step3GenerateTestCases";
import Step4RefineTestCases from "./Step4RefineTestCases";
import Step5GenerateKatalon from "./Step5GenerateKatalon";
import Step6RefineAutomation from "./Step6RefineAutomation";
import logo from "@/assets/logo.png";

const WizardContent = () => {
  const { currentStep, setCurrentStep } = useWizard();

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1ProjectSetup />;
      case 2: return <Step2Upload />;
      case 3: return <Step3GenerateTestCases />;
      case 4: return <Step4RefineTestCases />;
      case 5: return <Step5GenerateKatalon />;
      case 6: return <Step6RefineAutomation />;
      default: return <Step1ProjectSetup />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
        <img src={logo} alt="SimplifyTesting logo" className="w-8 h-8" />
        <div>
          <h1 className="text-sm font-bold text-foreground tracking-tight">SimplifyTesting</h1>
          <p className="text-xs text-muted-foreground">Intelligent Test Design & Automation</p>
        </div>
      </header>

      <WizardStepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />

      <main className="flex-1 overflow-auto">
        {renderStep()}
      </main>
    </div>
  );
};

const WizardLayout = () => (
  <WizardProvider>
    <WizardContent />
  </WizardProvider>
);

export default WizardLayout;
