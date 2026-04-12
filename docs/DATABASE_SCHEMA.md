# SimplifyTesting — Database Schema Reference

> Complete reference for all PostgreSQL tables, relationships, and policies.

---

## Entity Relationship Diagram

```
project_settings ─────┬──── documents ──── document_chunks (+ pgvector embeddings)
                       │
                       ├──── requirements ──┬── test_cases ── katalon_scripts
                       │                    └── requirement_figma_mappings
                       │
                       ├──── figma_screens
                       ├──── katalon_objects
                       ├──── katalon_suites
                       ├──── generation_jobs
                       ├──── test_runs
                       ├──── source_code_files
                       └──── custom_ai_models
```

---

## Tables

### `project_settings`
Central project configuration. All other tables reference this via `project_id`.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | Primary key |
| `project_name` | text | — | Display name |
| `base_url` | text | — | Application under test URL |
| `browser_type` | text | `'Chrome'` | Target browser |
| `locator_strategy` | text | `'id > css > xpath'` | Element locator priority |
| `naming_convention` | text | `'camelCase'` | Code naming style |
| `ai_model` | text | `'google/gemini-2.5-flash'` | Default AI model |
| `figma_file_url` | text | null | Figma design file URL |
| `figma_api_token` | text | null | Figma API access token |
| `ci_provider` | text | `'jenkins'` | CI/CD platform |
| `ci_webhook_url` | text | null | Webhook for triggering runs |
| `ci_auth_token` | text | null | CI/CD authentication |

---

### `documents`
Uploaded source documents (BRD, FSD, TDD, API specs).

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | `gen_random_uuid()` | Primary key |
| `project_id` | uuid | — | FK → project_settings |
| `name` | text | — | File name |
| `file_type` | text | — | MIME type |
| `file_size` | bigint | 0 | Size in bytes |
| `document_type` | text | `'brd'` | Category: brd, fsd, tdd, api_spec |
| `status` | text | `'uploaded'` | uploaded → processing → processed → error |
| `storage_path` | text | null | Supabase Storage path |
| `content_text` | text | null | Extracted plain text |
| `chunks_count` | int | 0 | Number of chunks created |
| `pages_count` | int | 0 | Number of pages detected |

---

### `document_chunks`
Text chunks with optional vector embeddings for RAG.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `project_id` | uuid | FK → project_settings |
| `document_id` | uuid | FK → documents (nullable) |
| `figma_screen_id` | uuid | FK → figma_screens (nullable) |
| `content` | text | Chunk text content |
| `embedding` | vector | pgvector embedding (1536-dim) |
| `source_type` | text | 'brd', 'fsd', 'figma', 'source_code' |
| `section_name` | text | Section heading |
| `screen_name` | text | Figma screen name |
| `page_number` | int | Source page number |
| `chunk_index` | int | Order within document |
| `token_count` | int | Estimated token count |
| `metadata` | jsonb | Additional context |

---

### `requirements`
AI-extracted or manually created requirements.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `project_id` | uuid | FK → project_settings |
| `document_id` | uuid | FK → documents |
| `req_code` | text | Unique code (e.g., FR-1) |
| `title` | text | Short title |
| `description` | text | Detailed description |
| `priority` | text | 'high', 'medium', 'low' |
| `category` | text | Functional category |
| `source_reference` | text | Source location (page, section) |
| `embedding` | vector | For semantic search |

---

### `test_cases`
Generated test cases linked to requirements.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `requirement_id` | uuid | FK → requirements |
| `tc_code` | text | Unique code (e.g., ST_TC_001) |
| `title` | text | Test case title |
| `description` | text | Summary |
| `preconditions` | text | Pre-test setup |
| `steps` | text | Step-by-step instructions |
| `expected_result` | text | Expected outcome |
| `priority` | text | 'high', 'medium', 'low' |
| `status` | text | 'generated', 'refined', 'approved' |
| `test_type` | text | functional, api, e2e, security, etc. |
| `test_level` | text | 'system', 'integration', 'uat' |
| `test_suite` | text | Smoke, Regression, Security, etc. |
| `source` | text | BRD, FSD, TDD, Figma, Source Code |
| `source_ref` | text | Requirement code reference |
| `api_endpoint` | text | For API test cases |
| `automation_eligible` | bool | Whether automatable |
| `module` | text | Feature module name |

---

### `katalon_scripts`
Generated Groovy automation scripts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `project_id` | uuid | FK → project_settings |
| `test_case_id` | uuid | FK → test_cases (nullable) |
| `tc_code` | text | Matching test case code |
| `content` | text | Groovy script content |
| `file_path` | text | Path in Katalon project |
| `script_type` | text | 'test_script' (default) |

---

### `generation_jobs`
Background job tracking for all AI generation tasks.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `project_id` | uuid | FK → project_settings |
| `job_type` | text | 'requirements', 'test_cases', 'katalon' |
| `status` | text | 'running', 'completed', 'failed' |
| `phase` | text | Current pipeline phase |
| `percentage` | int | Progress 0-100 |
| `total_batches` | int | Total batch count |
| `completed_batches` | int | Successfully completed |
| `failed_batches` | int | Failed batch count |
| `scripts_generated` | int | Items generated so far |
| `total_items` | int | Expected total items |
| `error_message` | text | Error details on failure |
| `credits_exhausted` | bool | AI quota exceeded |
| `partial` | bool | Completed with some failures |

---

## Key Functions

### `match_chunks`
Semantic search across document chunks using pgvector.

```sql
SELECT * FROM match_chunks(
  query_embedding := '<vector>',
  match_project_id := '<uuid>',
  match_source_types := ARRAY['brd', 'fsd'],
  match_limit := 10,
  match_threshold := 0.7
);
```

---

## Deletion Cascade Order

When deleting a project, data must be removed in this order:

1. `requirement_figma_mappings` (via requirement IDs)
2. `test_cases` (via requirement IDs)
3. `katalon_scripts`, `katalon_objects`, `katalon_suites` (parallel)
4. `generation_jobs`, `test_runs`, `source_code_files`, `custom_ai_models` (parallel)
5. `requirements`
6. `document_chunks`
7. `documents`
8. `figma_screens`
9. `project_settings`

This is implemented in `src/lib/services/projectService.ts → deleteProjectCascade()`.
