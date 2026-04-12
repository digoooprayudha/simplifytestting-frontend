/**
 * Typed wrappers around Supabase Edge Function calls.
 *
 * Using raw `fetch` instead of `supabase.functions.invoke` to gain
 * explicit control over timeouts and to avoid the default 60 s limit
 * imposed by the Supabase JS SDK.
 */

import { EDGE_FN_BASE, EDGE_FN_HEADERS } from "@/lib/constants";

/** Generic edge function caller with error handling. */
async function callEdgeFn<T = any>(
  fnName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const resp = await fetch(`${EDGE_FN_BASE}/${fnName}`, {
    method: "POST",
    headers: EDGE_FN_HEADERS as any,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
    throw new Error(errData.error || `Edge function ${fnName} failed (${resp.status})`);
  }

  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

// ── Requirement Extraction ──────────────────────────────────────────────
export interface ExtractRequirementsResult {
  jobId: string;
  totalDocuments: number;
}

export function extractRequirements(projectId: string, documentIds: string[]) {
  return callEdgeFn<ExtractRequirementsResult>("extract-requirements", {
    projectId,
    documentIds,
  });
}

// ── Test Case Generation (5-pass pipeline) ──────────────────────────────
export interface GenerateTestCasesResult {
  jobId: string;
  totalRequirements: number;
}

export function generateTestCases(
  projectId: string,
  opts: {
    selectedSources: string[];
    selectedLevels: string[];
    moduleName?: string;
    featureDescription?: string;
  },
) {
  return callEdgeFn<GenerateTestCasesResult>("generate-test-pipeline", {
    projectId,
    ...opts,
  });
}

// ── Katalon Script Generation ───────────────────────────────────────────
export interface GenerateKatalonResult {
  jobId?: string;
  totalTestCases?: number;
  totalBatches?: number;
  allCovered?: boolean;
}

export function generateKatalon(projectId: string, missingOnly = false) {
  return callEdgeFn<GenerateKatalonResult>("generate-katalon", {
    projectId,
    missingOnly,
  });
}

// ── Validation ──────────────────────────────────────────────────────────
export function validateArtifacts(projectId: string, artifactType: string) {
  return callEdgeFn("validate-artifacts", { projectId, artifactType });
}

// ── Katalon Validation & Fix ────────────────────────────────────────────
export function validateKatalon(projectId: string) {
  return callEdgeFn("validate-katalon", { projectId });
}

export function fixKatalon(projectId: string, scriptId: string, errors: string[]) {
  return callEdgeFn("fix-katalon", { projectId, scriptId, errors });
}

// ── CI / CD ─────────────────────────────────────────────────────────────
export function triggerKatalonRun(projectId: string) {
  return callEdgeFn("trigger-katalon-run", { projectId });
}
