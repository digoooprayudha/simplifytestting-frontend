# SimplifyTesting — Developer Documentation

> **AI Test Engineering Platform** for enterprise SDLC.  
> Extracts requirements from documents, generates multi-level test cases, and produces ready-to-run Katalon automation scripts.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Core Concepts](#core-concepts)
5. [Database Schema](#database-schema)
6. [Edge Functions (Backend)](#edge-functions-backend)
7. [Frontend Modules](#frontend-modules)
8. [State Management](#state-management)
9. [Generation Pipeline](#generation-pipeline)
10. [Design System](#design-system)
11. [Adding New Features](#adding-new-features)
12. [Environment & Configuration](#environment--configuration)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌────────────────────────────────────┐
│          React Frontend            │
│  (Vite + TypeScript + Tailwind)    │
├────────────────────────────────────┤
│       Supabase Client SDK          │
│  (Auth · Realtime · Storage)       │
├────────────────────────────────────┤
│     Supabase Edge Functions        │
│  (Deno · AI Gateway · Background)  │
├────────────────────────────────────┤
│     PostgreSQL + pgvector          │
│  (RLS · Triggers · Embeddings)     │
└────────────────────────────────────┘
```

**Data flow:**
1. User uploads documents → stored in Supabase Storage
2. Edge function extracts text, chunks, and creates embeddings
3. AI extracts structured requirements from chunks
4. 5-pass AI pipeline generates test cases from requirements
5. AI generates Katalon Groovy scripts from test cases
6. User downloads ZIP package for Katalon Studio

---

## Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Framework  | React 18 + TypeScript              |
| Build      | Vite                               |
| Styling    | Tailwind CSS + shadcn/ui           |
| State      | React Context + React Query        |
| Routing    | React Router v6 (nested routes)    |
| Backend    | Supabase (Postgres + Edge Fns)     |
| AI         | Lovable AI Gateway (Gemini/GPT)    |
| Animation  | Framer Motion                      |
| Export     | xlsx, jszip, file-saver            |

---

## Project Structure

```
src/
├── assets/                    # Static assets (logo, images)
├── components/
│   ├── ui/                    # shadcn/ui primitives (DO NOT EDIT)
│   ├── modals/                # Generation & validation modals
│   │   ├── RequirementGenerationModal.tsx
│   │   ├── TestCaseGenerationModal.tsx
│   │   ├── KatalonGenerationModal.tsx
│   │   └── ValidationModal.tsx
│   ├── test-cases/            # Test case sub-components
│   │   ├── useTestCasesState.ts    # Shared hook for TC page state
│   │   ├── TestCaseCardView.tsx
│   │   ├── TestCaseTableView.tsx
│   │   ├── TestCaseFilters.tsx
│   │   ├── TestCasePagination.tsx
│   │   └── BulkActionBar.tsx
│   ├── wizard/                # Workflow step components
│   │   ├── Step2Upload.tsx         # Document upload page
│   │   ├── Step4RefineTestCases.tsx # Test case management
│   │   ├── Step6RefineAutomation.tsx # Katalon script management
│   │   ├── WizardStepBar.tsx       # Top navigation bar
│   │   └── WizardLayout.tsx
│   ├── ProjectLayout.tsx      # Main project shell (sidebar + header + outlet)
│   ├── ProjectSidebar.tsx     # Left navigation sidebar
│   ├── ProjectSelector.tsx    # Project dropdown switcher
│   ├── ModelPicker.tsx        # AI model selector component
│   └── NavLink.tsx            # Sidebar nav link component
├── hooks/
│   ├── useGenerationJobPoller.ts  # Polls generation_jobs table
│   ├── use-mobile.tsx             # Responsive breakpoint hook
│   └── use-toast.ts               # Toast notification hook
├── integrations/
│   └── supabase/
│       ├── client.ts          # Auto-generated Supabase client (DO NOT EDIT)
│       └── types.ts           # Auto-generated DB types (DO NOT EDIT)
├── lib/
│   ├── constants.ts           # Shared constants & config values
│   ├── types.ts               # Domain-level TypeScript types
│   ├── services/              # Data access layer
│   │   ├── index.ts           # Barrel export
│   │   ├── projectService.ts  # Project CRUD operations
│   │   └── edgeFunctionService.ts # Edge function wrappers
│   ├── wizardContext.tsx       # Global project/wizard state
│   ├── katalonProjectFiles.ts # Katalon XML file generators
│   └── utils.ts               # Utility functions (cn, etc.)
├── pages/
│   ├── LandingPage.tsx        # Home — project list & creation
│   ├── ProjectDashboard.tsx   # Project overview with workflow progress
│   ├── RequirementsManager.tsx # Requirements CRUD + generation
│   ├── TestCases.tsx          # Lightweight TC page (uses wizard step)
│   ├── TraceabilityMatrix.tsx # Req → TC → Script coverage view
│   ├── CoverageMatrix.tsx     # Cross-reference coverage grid
│   ├── TestResults.tsx        # CI/CD execution & run history
│   └── NotFound.tsx
├── App.tsx                    # Route definitions
├── main.tsx                   # Entry point
└── index.css                  # Design tokens & global styles

supabase/
├── config.toml                # Supabase project config (DO NOT EDIT)
└── functions/                 # Edge Functions (Deno runtime)
    ├── extract-requirements/  # Document → Requirements
    ├── generate-test-pipeline/# 5-pass TC generation
    ├── generate-test-cases/   # Single-pass TC generation
    ├── enhance-test-cases/    # E2E, coverage gap, negative passes
    ├── generate-katalon/      # TC → Katalon Groovy scripts
    ├── validate-katalon/      # Syntax validation
    ├── fix-katalon/           # AI auto-fix for script errors
    ├── validate-artifacts/    # AI validation of TCs/requirements
    ├── analyze-figma/         # Figma file → screen elements
    ├── ingest-source-code/    # Source code → chunks + embeddings
    ├── trigger-katalon-run/   # Trigger CI/CD execution
    └── receive-test-results/  # Webhook for test results
```

---

## Core Concepts

### 1. Project Isolation
All data is strictly partitioned by `project_id`. Every query includes a project scope to prevent cross-project data leakage. Test case codes (e.g., `ST_TC_001`) are numbered independently per project.

### 2. Background Job System
Long-running AI operations (requirement extraction, test case generation, Katalon script generation) use the `generation_jobs` table as a state machine:

```
running → completed | failed
```

- **Frontend** polls the job via `useGenerationJobPoller` every 3 seconds
- **Edge function** updates `generation_jobs` rows as batches complete
- A **stale job timeout** (5 min) auto-fails stuck jobs
- Users can **cancel** jobs via the progress banner button

### 3. 5-Pass Test Case Pipeline
The `generate-test-pipeline` edge function orchestrates:

| Pass | Purpose | Concurrency |
|------|---------|-------------|
| 1    | Per-requirement generation | Sequential |
| 2    | End-to-end flow scenarios | Parallel with 3 & 4 |
| 3    | Coverage gap analysis | Parallel with 2 & 4 |
| 4    | Negative test scenarios | Parallel with 2 & 3 |
| 5    | AI Review & deduplication | Sequential (high-reasoning model) |

### 4. Katalon Output Structure
Generated scripts follow Katalon Studio's native format:
- `Scripts/` — Groovy test scripts with `waitForElementVisible` guards
- `Object Repository/` — XML page object definitions
- `Test Suites/` — XML suite definitions
- `Profiles/` — Environment profiles with `base_url`

---

## Database Schema

### Entity Relationship

```
project_settings (1)
  ├── documents (N)
  │     └── document_chunks (N) [+ embeddings via pgvector]
  ├── requirements (N)
  │     ├── test_cases (N)
  │     │     └── katalon_scripts (N)
  │     └── requirement_figma_mappings (N)
  ├── figma_screens (N)
  ├── katalon_objects (N)
  ├── katalon_suites (N)
  ├── generation_jobs (N)
  ├── test_runs (N)
  ├── source_code_files (N)
  └── custom_ai_models (N)
```

### Key Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `project_settings` | Project config | `project_name`, `base_url`, `ai_model`, `browser_type` |
| `documents` | Uploaded files | `name`, `file_type`, `status`, `storage_path` |
| `document_chunks` | Text chunks + embeddings | `content`, `embedding`, `source_type`, `section_name` |
| `requirements` | Extracted requirements | `req_code`, `title`, `description`, `priority`, `category` |
| `test_cases` | Generated test cases | `tc_code`, `title`, `steps`, `expected_result`, `test_type`, `test_level`, `test_suite` |
| `katalon_scripts` | Groovy automation scripts | `tc_code`, `content`, `file_path`, `script_type` |
| `katalon_objects` | Page object repository | `name`, `locator_type`, `locator_value`, `screen` |
| `generation_jobs` | Background job tracker | `status`, `phase`, `percentage`, `scripts_generated` |
| `test_runs` | CI/CD execution history | `status`, `passed`, `failed`, `results_json` |

### RLS Policies
All tables use permissive RLS (`USING (true)`) since the app has no authentication. If you add auth later, replace these with `auth.uid()` checks.

---

## Edge Functions (Backend)

All edge functions run on Deno and are deployed automatically.

### `extract-requirements`
**Input:** `{ projectId, documentIds }`  
**Process:** Reads document chunks → AI extracts structured requirements → saves to `requirements` table  
**Job type:** `requirements`

### `generate-test-pipeline`
**Input:** `{ projectId, selectedSources, selectedLevels, moduleName?, featureDescription? }`  
**Process:** 5-pass AI pipeline (see Core Concepts)  
**Job type:** `test_cases`

### `generate-katalon`
**Input:** `{ projectId, missingOnly? }`  
**Process:** Reads test cases → AI generates Groovy scripts → saves to `katalon_scripts` + `katalon_objects` + `katalon_suites`  
**Job type:** `katalon`

### `validate-katalon`
**Input:** `{ projectId }`  
**Process:** Syntax-checks all Groovy scripts, returns errors per script

### `fix-katalon`
**Input:** `{ projectId, scriptId, errors }`  
**Process:** AI fixes the specified script based on error messages

### `validate-artifacts`
**Input:** `{ projectId, artifactType }`  
**Process:** AI reviews requirements or test cases for quality issues

### `analyze-figma`
**Input:** `{ projectId, figmaFileUrl, figmaApiToken }`  
**Process:** Fetches Figma file → extracts screens & elements → saves to `figma_screens`

### `trigger-katalon-run`
**Input:** `{ projectId }`  
**Process:** Sends webhook to CI/CD system → creates `test_runs` entry

### `receive-test-results`
**Input:** `{ callbackToken, results }`  
**Process:** Webhook endpoint that receives test execution results

---

## Frontend Modules

### Pages
| Page | Route | Description |
|------|-------|-------------|
| `LandingPage` | `/` | Project list, create/edit/delete |
| `ProjectDashboard` | `/project/:id` | Workflow progress, coverage widgets |
| `Step2Upload` | `/project/:id/documents` | Document/Figma/code upload |
| `RequirementsManager` | `/project/:id/requirements` | Requirements CRUD + generation |
| `Step4RefineTestCases` | `/project/:id/test-cases` | Test case management + generation |
| `Step6RefineAutomation` | `/project/:id/katalon` | Katalon script management + export |
| `TestResults` | `/project/:id/results` | CI/CD config + run history |
| `TraceabilityMatrix` | `/project/:id/traceability` | Req → TC → Script chain |
| `CoverageMatrix` | `/project/:id/coverage` | Cross-reference grid |

### Key Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useWizard` | `wizardContext.tsx` | Access global project state |
| `useProjectFromUrl` | `wizardContext.tsx` | Sync project from URL params |
| `useGenerationJobPoller` | `useGenerationJobPoller.ts` | Poll a specific job by ID |
| `useActiveGenerationJobs` | `useGenerationJobPoller.ts` | Global: detect any running job for a project |
| `useTestCasesState` | `useTestCasesState.ts` | Complete state machine for test case pages |

### Services Layer (`src/lib/services/`)
| Module | Exports |
|--------|---------|
| `projectService` | `fetchProjectsWithStats()`, `deleteProjectCascade()` |
| `edgeFunctionService` | `extractRequirements()`, `generateTestCases()`, `generateKatalon()`, `validateArtifacts()`, `validateKatalon()`, `fixKatalon()`, `triggerKatalonRun()` |

---

## State Management

```
QueryClientProvider (React Query — for caching)
  └── WizardProvider (React Context)
        ├── projectId         — current active project UUID
        ├── projectSettings   — project config (name, URL, model)
        ├── currentStep       — highest completed workflow step
        ├── uploadSummary     — document upload stats
        ├── katalon           — loaded Katalon output data
        └── canProceed        — wizard navigation guard
```

**Pattern:** Pages fetch their own data using `supabase` directly (or the services layer) and store it in local state. The `WizardContext` only holds cross-cutting project-level state.

---

## Generation Pipeline

### Starting a Generation Job

```typescript
// 1. Call edge function (returns immediately with jobId)
const { jobId } = await generateKatalon(projectId, missingOnly);

// 2. Poll the job table for progress
const { job, polling } = useGenerationJobPoller({
  projectId,
  jobId,
  onComplete: (job) => { /* refresh data */ },
  onError: (job) => { /* show error */ },
});

// 3. Display progress
<Progress value={job.percentage} />
<span>{job.scripts_generated} scripts generated</span>
```

### Job Lifecycle

```
Client                    Edge Function              Database
  │                           │                         │
  │── POST /generate-katalon─▶│                         │
  │◀── { jobId } ─────────────│                         │
  │                           │── INSERT generation_jobs▶│
  │                           │                         │
  │── Poll GET generation_jobs│                         │
  │                           │── UPDATE (progress) ───▶│
  │◀── { percentage: 50 } ────│                         │
  │                           │                         │
  │── Poll GET generation_jobs│                         │
  │                           │── UPDATE (completed) ──▶│
  │◀── { status: completed } ─│                         │
```

---

## Design System

### Tokens (defined in `index.css`)
All colours use HSL values via CSS custom properties:
- `--background`, `--foreground` — base colours
- `--primary`, `--primary-foreground` — brand accent
- `--destructive` — errors/danger
- `--warning` — caution states
- `--success` — positive states
- `--info` — informational
- `--muted`, `--accent` — secondary surfaces

### Rules
1. **Never use raw colours** in components — always use semantic tokens
2. Use `bg-primary/15 text-primary` pattern for badges/pills
3. Use shadcn/ui components from `src/components/ui/`
4. Use Framer Motion for page/element animations
5. Responsive: test at 1280px and mobile widths

---

## Adding New Features

### Adding a New Page
1. Create `src/pages/YourPage.tsx`
2. Add route in `src/App.tsx` under the `ProjectLayout` route
3. Add sidebar link in `src/components/ProjectSidebar.tsx`
4. Use `useWizard()` to access `projectId`

### Adding a New Edge Function
1. Create `supabase/functions/your-function/index.ts`
2. Add typed wrapper in `src/lib/services/edgeFunctionService.ts`
3. Functions are auto-deployed on save
4. Access secrets via `Deno.env.get("SECRET_NAME")`

### Adding a New Database Table
1. Use the migration tool (never edit schema files directly)
2. Add RLS policies appropriate for your use case
3. The `types.ts` file auto-regenerates after migration
4. Import types: `import type { Tables } from "@/integrations/supabase/types"`

### Adding a New Generation Job Type
1. Create edge function that inserts into `generation_jobs` with your `job_type`
2. Update progress via `UPDATE generation_jobs SET percentage = ..., phase = ...`
3. Frontend uses `useGenerationJobPoller` — no changes needed
4. Add phase labels in your modal component

---

## Environment & Configuration

### Environment Variables (auto-managed)
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

### Edge Function Secrets
| Secret | Purpose |
|--------|---------|
| `LOVABLE_API_KEY` | Lovable AI Gateway access |
| `LITELLM_API_KEY` | LiteLLM proxy (same gateway) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin DB access in edge functions |

### Files You Must NOT Edit
- `src/integrations/supabase/client.ts` — auto-generated
- `src/integrations/supabase/types.ts` — auto-generated
- `supabase/config.toml` — auto-managed
- `.env` — auto-managed

---

## Troubleshooting

### "Generation appears stuck"
The poller auto-detects stale jobs (no update for 5 min) and marks them failed. Users can also click "Cancel" on the progress banner.

### "Data not showing after generation"
The Dashboard auto-refreshes via realtime subscription on `generation_jobs`. Other pages require manual refresh (click Refresh button).

### "Test cases missing from Traceability"
Test cases are linked to requirements via `requirement_id`. If a requirement is deleted, its test cases become orphaned. Always delete through the UI which handles cascades.

### "Katalon ZIP won't import"
Ensure scripts have proper Groovy imports. Use the "Syntax Check" button to validate before download. The "AI Auto-Fix" feature can resolve common issues.

### Console Warning: "forwardRef on ProjectSidebar"
Non-breaking React warning. The sidebar component receives a ref from the SidebarProvider but doesn't use `forwardRef`. Safe to ignore or fix by wrapping with `React.forwardRef`.

---

## License & Contributing

This is a private project. For contributions:
1. Create a feature branch from `main`
2. Follow the existing code patterns and design system
3. Test with real project data before merging
4. Edge functions should handle errors gracefully and update job status
