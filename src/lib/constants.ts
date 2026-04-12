/**
 * Application-wide constants.
 * Centralises magic strings and configuration values so they can be
 * changed in one place without hunting through component files.
 */

// ── Workflow Steps ──────────────────────────────────────────────────────
export const WORKFLOW_STEPS = [
  { num: 1, key: "documents",    label: "Uploaded Sources", route: "documents" },
  { num: 2, key: "requirements", label: "Requirements",     route: "requirements" },
  { num: 3, key: "test-cases",   label: "Test Cases",       route: "test-cases" },
  { num: 4, key: "katalon",      label: "Katalon Scripts",  route: "katalon" },
  { num: 5, key: "results",      label: "Test Results",     route: "results" },
] as const;

// ── Priority / Status Colours (semantic tokens only) ────────────────────
export const PRIORITY_COLORS: Record<string, string> = {
  high:   "bg-destructive/15 text-destructive",
  medium: "bg-warning/15 text-warning",
  low:    "bg-success/15 text-success",
};

export const STATUS_COLORS: Record<string, string> = {
  generated: "bg-muted text-muted-foreground",
  refined:   "bg-info/15 text-info",
  approved:  "bg-success/15 text-success",
};

export const TEST_TYPE_COLORS: Record<string, string> = {
  functional:  "bg-primary/15 text-primary",
  ui:          "bg-info/15 text-info",
  api:         "bg-warning/15 text-warning",
  e2e:         "bg-success/15 text-success",
  negative:    "bg-destructive/15 text-destructive",
  security:    "bg-destructive/15 text-destructive",
  performance: "bg-accent text-accent-foreground",
  boundary:    "bg-muted text-muted-foreground",
  integration: "bg-primary/15 text-primary",
  audit:       "bg-muted text-muted-foreground",
  compliance:  "bg-info/15 text-info",
  validation:  "bg-warning/15 text-warning",
  concurrency: "bg-accent text-accent-foreground",
};

// ── Pagination ──────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

// ── Generation Job Polling ──────────────────────────────────────────────
export const JOB_POLL_INTERVAL_MS = 3_000;
export const STALE_JOB_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes

// ── Browser Options ─────────────────────────────────────────────────────
export const BROWSER_OPTIONS  = ["Chrome", "Firefox", "Edge", "Safari"] as const;
export const NAMING_OPTIONS   = ["camelCase", "snake_case", "PascalCase", "kebab-case"] as const;
export const LOCATOR_OPTIONS  = [
  "id > css > xpath",
  "css > id > xpath",
  "xpath > css > id",
  "id > xpath > css",
] as const;

// ── Supabase Edge Function Base URL ─────────────────────────────────────
export const EDGE_FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
export const EDGE_FN_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
} as const;
