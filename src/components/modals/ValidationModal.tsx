import ModelPicker from "@/components/ModelPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/apiClient";
import { useWizard } from "@/lib/wizardContext";
import {
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface Suggestion {
  type: "add" | "update" | "delete";
  target_id?: string | null;
  file_path?: string | null;
  title: string;
  description: string;
  reason: string;
  proposed_content?: string | null;
  change_summary?: string | null;
  confidence?: "low" | "medium" | "high" | null;
}

interface ApplyStats {
  updated: number;
  deleted: number;
  inserted: number;
  skipped: number;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

interface ValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifactType: "requirements" | "test_cases" | "katalon_scripts";
  projectId: string;
  onAccepted?: () => void;
}

const typeLabels: Record<string, string> = {
  requirements: "Requirements",
  test_cases: "Test Cases",
  katalon_scripts: "Katalon Scripts",
};

const typeBadgeStyles: Record<string, string> = {
  add: "bg-success/15 text-success border-success/30",
  update: "bg-warning/15 text-warning border-warning/30",
  delete: "bg-destructive/15 text-destructive border-destructive/30",
};

const typeIcons: Record<string, React.ReactNode> = {
  add: <Plus className="w-3 h-3" />,
  update: <Pencil className="w-3 h-3" />,
  delete: <Trash2 className="w-3 h-3" />,
};

const confidenceBadgeStyles: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-success/10 text-success border-success/30",
};

const contextOptions: Record<string, Array<{ key: string; label: string }>> = {
  requirements: [
    { key: "artifacts", label: "Generated Requirements" },
    { key: "sources", label: "Uploaded Sources" },
  ],
  test_cases: [
    { key: "artifacts", label: "Generated Test Cases" },
    { key: "requirements", label: "Generated Requirements" },
  ],
  katalon_scripts: [
    { key: "artifacts", label: "Generated Katalon Scripts" },
    { key: "test_cases", label: "Generated Test Cases" },
  ],
};

const ValidationModal = ({
  open,
  onOpenChange,
  artifactType,
  projectId,
  onAccepted,
}: ValidationModalProps) => {
  const { projectSettings } = useWizard();
  const options = contextOptions[artifactType] || contextOptions.requirements;
  const [model, setModel] = useState(
    projectSettings?.ai_model || "google/gemini-2.5-flash",
  );
  const [contextSources, setContextSources] = useState<string[]>(
    options.map((o) => o.key),
  );
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [rejected, setRejected] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);

  const isActionableKatalonSuggestion = useCallback((suggestion: Suggestion) => {
    if (artifactType !== "katalon_scripts") return true;
    if (suggestion.type === "update") {
      return !!suggestion.target_id && !!suggestion.proposed_content?.trim();
    }
    if (suggestion.type === "delete") {
      return !!suggestion.target_id;
    }
    return false;
  }, [artifactType]);

  const toggleSource = (source: string) => {
    setContextSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source],
    );
  };

  const runValidation = useCallback(async () => {
    if (contextSources.length === 0) {
      toast.error("Select at least one context source");
      return;
    }
    setLoading(true);
    setSuggestions(null);
    setAccepted(new Set());
    setRejected(new Set());

    try {
      const data = await apiClient.post<{ suggestions: Suggestion[] }>("/pipelines/validate-requirements", {
        project_id: projectId,
      });

      const validSuggestions = (data.suggestions || []).filter((s: Suggestion) => {
        if (!(s.title?.trim() || s.description?.trim())) return false;
        if (artifactType !== "katalon_scripts") return true;
        if (s.type === "update") return !!s.target_id && !!s.proposed_content?.trim();
        if (s.type === "delete") return !!s.target_id;
        return true;
      });
      setSuggestions(validSuggestions);
      if (validSuggestions.length === 0) {
        toast.success("No issues found — everything looks good!");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Validation failed");
    } finally {
      setLoading(false);
    }
  }, [projectId, artifactType, contextSources, model]);

  const acceptSuggestion = (idx: number) => {
    const suggestion = suggestions?.[idx];
    if (suggestion && !isActionableKatalonSuggestion(suggestion)) {
      toast.info("This Katalon suggestion is preview-only and cannot be applied.");
      return;
    }
    setAccepted((prev) => new Set(prev).add(idx));
    setRejected((prev) => {
      const n = new Set(prev);
      n.delete(idx);
      return n;
    });
  };

  const rejectSuggestion = (idx: number) => {
    setRejected((prev) => new Set(prev).add(idx));
    setAccepted((prev) => {
      const n = new Set(prev);
      n.delete(idx);
      return n;
    });
  };

  const acceptAll = () => {
    if (!suggestions) return;
    const actionableIndexes = suggestions
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => isActionableKatalonSuggestion(s))
      .map(({ i }) => i);
    const all = new Set(actionableIndexes);
    setAccepted(all);
    setRejected(new Set());
    if (artifactType === "katalon_scripts" && all.size < suggestions.length) {
      toast.info(
        `${suggestions.length - all.size} preview-only Katalon suggestion(s) were skipped.`,
      );
    }
  };

  const applyRequirementSuggestions = async (acceptedItems: Suggestion[]) => {
    const response = await apiClient.get<{ requirements: any[] }>(`/projects/${projectId}/requirements`);
    const existing = response.requirements || [];
    if (existing.length === 0) throw new Error("No existing requirements found");

    const existingTitles = new Set(existing.map((r: any) => r.title.toLowerCase().trim()));
    let maxFR = 0, maxNFR = 0;
    existing.forEach((r: any) => {
      const frMatch = r.req_code.match(/^FR-(\d+)/);
      const nfrMatch = r.req_code.match(/^NFR-(\d+)/);
      if (frMatch) maxFR = Math.max(maxFR, parseInt(frMatch[1]));
      if (nfrMatch) maxNFR = Math.max(maxNFR, parseInt(nfrMatch[1]));
    });

    let skipped = 0;
    for (const s of acceptedItems) {
      if (s.type === "add") {
        if (existingTitles.has(s.title.toLowerCase().trim())) { skipped++; continue; }
        const isNFR = /non.?functional|nfr|performance|security|compliance|accessibility|backup|scalab/i.test(s.title + s.description);
        const code = isNFR ? `NFR-${++maxNFR}` : `FR-${++maxFR}`;
        await apiClient.post(`/projects/${projectId}/requirements`, {
          req_code: code, title: s.title, description: s.description, priority: "medium",
        });
        existingTitles.add(s.title.toLowerCase().trim());
      } else if (s.type === "update" && s.target_id) {
        const target = existing.find((r: any) => r.req_code === s.target_id);
        if (target) await apiClient.patch(`/requirements/${target.id}`, { description: s.description });
      } else if (s.type === "delete" && s.target_id) {
        const target = existing.find((r: any) => r.req_code === s.target_id);
        if (target) await apiClient.delete(`/requirements/${target.id}`);
      }
    }
    if (skipped > 0) toast.info(`${skipped} duplicate requirement(s) skipped`);
  };

  const applyTestCaseSuggestions = async (acceptedItems: Suggestion[]) => {
    const tcResponse = await apiClient.get<{ test_cases: any[] }>(`/projects/${projectId}/test-cases`);
    const existing = tcResponse.test_cases || [];
    const existingTitles = new Set(existing.map((tc: any) => tc.title.toLowerCase().trim()));

    let maxTC = 0;
    existing.forEach((tc: any) => {
      const m = tc.tc_code.match(/(\d+)$/);
      if (m) maxTC = Math.max(maxTC, parseInt(m[1]));
    });

    const reqResponse = await apiClient.get<{ requirements: any[] }>(`/projects/${projectId}/requirements`);
    const firstReqId = reqResponse.requirements?.[0]?.id;

    let skipped = 0;
    for (const s of acceptedItems) {
      if (s.type === "add") {
        if (existingTitles.has(s.title.toLowerCase().trim())) { skipped++; continue; }
        await apiClient.post(`/projects/${projectId}/test-cases`, {
          requirement_id: firstReqId,
          tc_code: `ST_TC_${String(++maxTC).padStart(3, "0")}`,
          title: s.title,
          description: s.description,
          steps: s.description,
          expected_result: "As described in suggestion",
          priority: "medium",
        });
        existingTitles.add(s.title.toLowerCase().trim());
      } else if (s.type === "update" && s.target_id) {
        const target = existing.find((tc: any) => tc.tc_code === s.target_id);
        if (target) await apiClient.patch(`/test-cases/${target.id}`, { description: s.description });
      } else if (s.type === "delete" && s.target_id) {
        const target = existing.find((tc: any) => tc.tc_code === s.target_id);
        if (target) await apiClient.delete(`/test-cases/${target.id}`);
      }
    }
    if (skipped > 0) toast.info(`${skipped} duplicate test case(s) skipped`);
  };

  const applyKatalonSuggestions = async (acceptedItems: Suggestion[]): Promise<ApplyStats> => {
    const katalonResponse = await apiClient.get<{ scripts: any[] }>(`/projects/${projectId}/katalon`);
    const existing = katalonResponse.scripts || [];

    const stats: ApplyStats = { updated: 0, deleted: 0, inserted: 0, skipped: 0 };

    for (const s of acceptedItems) {
      if (s.type === "update" && s.target_id) {
        const target = existing.find((ks: any) => ks.test_case_code === s.target_id);
        if (target && s.proposed_content?.trim()) {
          if (target.content.trim() === s.proposed_content.trim()) { stats.skipped++; continue; }
          // No direct patch endpoint for katalon scripts — skip for now
          stats.skipped++;
        } else {
          stats.skipped++;
        }
      } else if (s.type === "delete" && s.target_id) {
        // No delete endpoint for individual katalon scripts — skip
        stats.skipped++;
      } else {
        stats.skipped++;
      }
    }
    return stats;
  };

  const handleApply = async () => {
    const count = accepted.size;
    if (count === 0) {
      toast.error("No suggestions accepted");
      return;
    }
    setApplying(true);
    try {
      const acceptedList = suggestions!.filter((_, i) => accepted.has(i));
      let katalonStats: ApplyStats | null = null;
      if (artifactType === "requirements") {
        await applyRequirementSuggestions(acceptedList);
      } else if (artifactType === "test_cases") {
        await applyTestCaseSuggestions(acceptedList);
      } else if (artifactType === "katalon_scripts") {
        katalonStats = await applyKatalonSuggestions(acceptedList);
      }
      if (artifactType === "katalon_scripts" && katalonStats) {
        if (katalonStats.updated === 0 && katalonStats.deleted === 0) {
          toast.info(
            katalonStats.skipped > 0
              ? `${katalonStats.skipped} Katalon suggestion(s) skipped because they were not actionable yet.`
              : "No Katalon changes were applied.",
          );
        } else {
          const summaryParts = [];
          if (katalonStats.updated > 0) {
            summaryParts.push(`${katalonStats.updated} updated`);
          }
          if (katalonStats.deleted > 0) {
            summaryParts.push(`${katalonStats.deleted} deleted`);
          }
          if (katalonStats.skipped > 0) {
            summaryParts.push(`${katalonStats.skipped} skipped`);
          }
          toast.success(`Katalon suggestions applied: ${summaryParts.join(", ")}.`);
        }
      } else {
        toast.success(`${count} suggestion(s) applied successfully!`);
      }
      onAccepted?.();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to apply suggestions");
    } finally {
      setApplying(false);
    }
  };

  const pendingCount = suggestions
    ? suggestions.length - accepted.size - rejected.size
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Validate {typeLabels[artifactType]}
          </DialogTitle>
        </DialogHeader>

        {!suggestions && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">AI Model</p>
              <ModelPicker
                value={model}
                onChange={setModel}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                Context Sources
              </p>
              <div className="flex gap-4">
                {options.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={contextSources.includes(opt.key)}
                      onCheckedChange={() => toggleSource(opt.key)}
                      disabled={loading}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              The AI will analyze your {typeLabels[artifactType].toLowerCase()}{" "}
              and suggest additions, updates, or deletions to improve quality
              and coverage.
            </p>

            <Button
              onClick={runValidation}
              disabled={loading || contextSources.length === 0}
              className="w-full gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading ? "Analyzing..." : "Run Validation"}
            </Button>
          </div>
        )}

        {suggestions && suggestions.length > 0 && (
          <>
            <div className="flex items-center justify-between py-1">
              <p className="text-xs text-muted-foreground">
                {suggestions.length} suggestion(s) • {accepted.size} accepted •{" "}
                {rejected.size} rejected
                {pendingCount > 0 && ` • ${pendingCount} pending`}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={acceptAll}
                  className="h-7 text-xs gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" /> Accept All
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSuggestions(null);
                    setAccepted(new Set());
                    setRejected(new Set());
                  }}
                  className="h-7 text-xs"
                >
                  ← Re-run
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-2">
              <div className="space-y-2">
                {suggestions.map((s, idx) => {
                  const isAccepted = accepted.has(idx);
                  const isRejected = rejected.has(idx);
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border transition-colors ${
                        isAccepted
                          ? "bg-success/5 border-success/30"
                          : isRejected
                            ? "bg-muted/50 border-border opacity-50"
                            : "bg-card border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={`text-[10px] gap-1 ${typeBadgeStyles[s.type]}`}
                            >
                              {typeIcons[s.type]} {s.type.toUpperCase()}
                            </Badge>
                            {s.target_id && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {s.target_id}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {s.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {s.description}
                          </p>
                          {artifactType === "katalon_scripts" && s.file_path && (
                            <p className="text-[10px] text-muted-foreground mt-1 font-mono break-all">
                              {s.file_path}
                            </p>
                          )}
                          {artifactType === "katalon_scripts" && s.change_summary && (
                            <p className="text-[10px] text-foreground mt-1">
                              Change: {s.change_summary}
                            </p>
                          )}
                          <p className="text-[10px] text-primary mt-1 italic">
                            Reason: {s.reason}
                          </p>
                          {artifactType === "katalon_scripts" && s.proposed_content && (
                            <pre className="mt-2 max-h-36 overflow-auto rounded-md bg-muted p-2 text-[10px] text-muted-foreground whitespace-pre-wrap break-words">
                              {s.proposed_content}
                            </pre>
                          )}
                          {artifactType === "katalon_scripts" && !isActionableKatalonSuggestion(s) && (
                            <p className="text-[10px] text-warning mt-1">
                              This suggestion is preview-only and will be skipped by Apply.
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {artifactType === "katalon_scripts" && s.confidence && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${confidenceBadgeStyles[s.confidence]}`}
                            >
                              {s.confidence}
                            </Badge>
                          )}
                          {!isAccepted && !isRejected ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => acceptSuggestion(idx)}
                                className="h-7 w-7 p-0 text-success hover:bg-success/10"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => rejectSuggestion(idx)}
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : isAccepted ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-success/10 text-success border-success/30"
                            >
                              Accepted
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-muted text-muted-foreground"
                            >
                              Rejected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <Button
                onClick={handleApply}
                disabled={accepted.size === 0 || applying}
                className="w-full gap-2"
              >
                {applying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {applying
                  ? "Applying..."
                  : `Apply ${accepted.size} Accepted Suggestion(s)`}
              </Button>
            </div>
          </>
        )}

        {suggestions && suggestions.length === 0 && (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              All looks good!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No improvements suggested for your{" "}
              {typeLabels[artifactType].toLowerCase()}.
            </p>
            <Button
              variant="outline"
              onClick={() => setSuggestions(null)}
              className="mt-4"
            >
              Re-run with different settings
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ValidationModal;
