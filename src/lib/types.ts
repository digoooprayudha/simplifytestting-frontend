/**
 * Shared application-level TypeScript types.
 *
 * Database row types are auto-generated in src/integrations/supabase/types.ts
 * — import from there when you need the raw DB shape.
 * This file holds *domain* types that may differ from or compose DB types.
 */

import type { Tables } from "@/integrations/supabase/types";

// ── Domain aliases ──────────────────────────────────────────────────────
export type Requirement    = Tables<"requirements">;
export type TestCase       = Tables<"test_cases"> & { requirements?: { req_code: string } | null };
export type KatalonScript  = Tables<"katalon_scripts">;
export type KatalonObject  = Tables<"katalon_objects">;
export type KatalonSuite   = Tables<"katalon_suites">;
export type Document       = Tables<"documents">;
export type ProjectSetting = Tables<"project_settings">;
export type GenerationJob  = Tables<"generation_jobs">;
export type TestRun        = Tables<"test_runs">;

// ── View-model types used across pages ──────────────────────────────────
export interface ProjectWithStats extends ProjectSetting {
  documents: number;
  requirements: number;
  testCases: number;
  katalonScripts: number;
}

export interface CoverageStats {
  covered: number;
  total: number;
  percent: number;
}

export interface AutomationCoverage {
  scripted: number;
  eligible: number;
  percent: number;
}

// ── Katalon output shape (used by wizard context & modals) ──────────────
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
