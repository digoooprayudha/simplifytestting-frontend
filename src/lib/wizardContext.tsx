import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "./apiClient";
import { toast } from "sonner";

export interface AIModel {
  value: string;
  label: string;
  description?: string;
}

export const EMBEDDING_MODEL = "azure_ai/text-embedding-3-large";

export interface ProjectSettings {
  id?: string;
  project_name: string;
  base_url: string;
  browser_type: "Chrome" | "Edge" | "Firefox";
  locator_strategy: string;
  naming_convention: "camelCase" | "snake_case" | "PascalCase" | "kebab-case";
  ai_model: string;
  figma_file_url?: string;
  figma_api_token?: string;
}

export interface UploadSummary {
  totalDocuments: number;
  totalPages: number;
  totalFigmaScreens: number;
  totalChunks: number;
}

export interface KatalonFile {
  file_path: string;
  content: string;
  test_case_code?: string;
}

export interface KatalonOutput {
  scripts: (KatalonFile & { test_case_code: string })[];
  page_objects: KatalonFile[];
  test_suite: KatalonFile;
  data_files?: KatalonFile[];
}

interface WizardContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  projectSettings: ProjectSettings;
  setProjectSettings: (settings: ProjectSettings) => void;
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  uploadSummary: UploadSummary;
  setUploadSummary: (summary: UploadSummary) => void;
  katalon: KatalonOutput | null;
  setKatalon: (k: KatalonOutput | null) => void;
  canProceed: boolean;
  setCanProceed: (v: boolean) => void;
  loadingProject: boolean;
  refreshProgress: () => Promise<void>;
  availableModels: AIModel[];
  getModelLabel: (value: string) => string;
  isKnownModel: (value: string) => boolean;
}

const defaultSettings: ProjectSettings = {
  project_name: "",
  base_url: "",
  browser_type: "Chrome",
  locator_strategy: "id > css > xpath",
  naming_convention: "camelCase",
  ai_model: "zai.glm-4.7",
};

const WizardContext = createContext<WizardContextType | null>(null);

export const WizardProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [projectSettings, setProjectSettings] =
    useState<ProjectSettings>(defaultSettings);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary>({
    totalDocuments: 0,
    totalPages: 0,
    totalFigmaScreens: 0,
    totalChunks: 0,
  });
  const [katalon, setKatalon] = useState<KatalonOutput | null>(null);
  const [canProceed, setCanProceed] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await apiClient.get<AIModel[]>("/settings/ai-models");
        setAvailableModels(models);
      } catch (error) {
        console.error("Failed to fetch AI models from backend");
      }
    };
    fetchModels();
  }, []);

  const getModelLabel = (value: string) => 
    availableModels.find(m => m.value === value)?.label || value;
  
  const isKnownModel = (value: string) =>
    availableModels.some(m => m.value === value);

  const refreshProgress = async () => {
    if (!projectId) return;
    try {
      const stats = await apiClient.get<any>(`/projects/${projectId}/dashboard-stats`);
      
      const hasDocs = (stats.documents ?? 0) > 0;
      const hasReqs = (stats.requirements ?? 0) > 0;
      const hasTCs = (stats.test_cases ?? 0) > 0;
      const hasKatalon = (stats.katalon_scripts ?? 0) > 0;

      let step = 2; // project exists → at least step 2
      if (hasDocs) step = 3;
      if (hasReqs) step = 4;
      if (hasTCs) step = 5;
      if (hasKatalon) step = 6;
      setCurrentStep(step);
    } catch (error) {
      console.error("Failed to refresh progress");
    }
  };

  return (
    <WizardContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        projectSettings,
        setProjectSettings,
        projectId,
        setProjectId,
        uploadSummary,
        setUploadSummary,
        katalon,
        setKatalon,
        canProceed,
        setCanProceed,
        loadingProject,
        refreshProgress,
        availableModels,
        getModelLabel,
        isKnownModel,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
};

export const useWizard = () => {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
};

/** Helper to load katalon data from DB */
async function loadKatalonFromDb(pid: string): Promise<KatalonOutput | null> {
  try {
    const data = await apiClient.get<KatalonOutput>(`/projects/${pid}/katalon`);
    if (!data.scripts || data.scripts.length === 0) return null;
    return data;
  } catch (error) {
    return null;
  }
}

/** Hook to sync projectId from URL param and load settings + katalon from DB */
export const useProjectFromUrl = () => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const {
    projectId,
    setProjectId,
    setProjectSettings,
    setCurrentStep,
    setKatalon,
  } = useWizard();

  useEffect(() => {
    if (!urlProjectId) return;
    if (projectId === urlProjectId) return;

    const loadProject = async () => {
      setKatalon(null);
      setProjectId(urlProjectId);

      try {
        const data = await apiClient.get<any>(`/projects/${urlProjectId}/settings`);
        if (data) {
          setProjectSettings({
            id: data.id,
            project_name: data.project_name,
            base_url: data.base_url,
            browser_type: data.browser_type as any,
            locator_strategy: data.locator_strategy,
            naming_convention: data.naming_convention as any,
            ai_model: data.ai_model || "zai.glm-4.7",
            figma_file_url: data.figma_file_url || undefined,
            figma_api_token: data.figma_api_token || undefined,
          });
        }

        const stats = await apiClient.get<any>(`/projects/${urlProjectId}/dashboard-stats`);
        const hasDocs = (stats.documents ?? 0) > 0;
        const hasReqs = (stats.requirements ?? 0) > 0;
        const hasTCs = (stats.test_cases ?? 0) > 0;
        const hasKatalon = (stats.katalon_scripts ?? 0) > 0;

        let step = 2;
        if (hasDocs) step = 3;
        if (hasReqs) step = 4;
        if (hasTCs) step = 5;
        if (hasKatalon) step = 6;
        setCurrentStep(step);

        const katalonData = await loadKatalonFromDb(urlProjectId);
        if (katalonData) {
          setKatalon(katalonData);
        }
      } catch (error) {
        toast.error("Failed to load project context");
      }
    };
    loadProject();
  }, [
    urlProjectId,
    projectId,
    setProjectId,
    setProjectSettings,
    setCurrentStep,
    setKatalon,
  ]);

  return urlProjectId;
};

export { loadKatalonFromDb };

