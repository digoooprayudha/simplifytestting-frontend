# SimplifyTesting — API Reference

> Quick reference for all Supabase Edge Functions (backend API).

---

## Authentication

All edge function calls use the Supabase anon key:

```typescript
headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer <SUPABASE_ANON_KEY>",
  "apikey": "<SUPABASE_ANON_KEY>"
}
```

---

## Endpoints

### POST `/functions/v1/extract-requirements`

Extract requirements from uploaded documents using AI.

**Request:**
```json
{
  "projectId": "uuid",
  "documentIds": ["uuid", "uuid"]
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "totalDocuments": 3
}
```

**Notes:** Creates a `generation_jobs` row with `job_type = "requirements"`. Poll the job for progress.

---

### POST `/functions/v1/generate-test-pipeline`

Run the 5-pass AI test case generation pipeline.

**Request:**
```json
{
  "projectId": "uuid",
  "selectedSources": ["documents", "figma", "code"],
  "selectedLevels": ["system", "integration", "uat"],
  "moduleName": "Authentication",
  "featureDescription": "User login and registration flows"
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "totalRequirements": 77
}
```

**Job phases:** `starting` → `generating` → `enhancing` → `reviewing` → `complete`

---

### POST `/functions/v1/generate-katalon`

Generate Katalon Groovy automation scripts from test cases.

**Request:**
```json
{
  "projectId": "uuid",
  "missingOnly": false
}
```

**Response (normal):**
```json
{
  "jobId": "uuid",
  "totalTestCases": 100,
  "totalBatches": 5
}
```

**Response (all covered):**
```json
{
  "allCovered": true
}
```

---

### POST `/functions/v1/validate-katalon`

Syntax-check all Katalon scripts for a project.

**Request:**
```json
{
  "projectId": "uuid"
}
```

**Response:**
```json
{
  "results": [
    {
      "scriptId": "uuid",
      "tcCode": "ST_TC_001",
      "valid": false,
      "errors": ["Missing import statement", "Undefined variable"]
    }
  ],
  "totalChecked": 100,
  "totalErrors": 3
}
```

---

### POST `/functions/v1/fix-katalon`

AI auto-fix for a specific Katalon script.

**Request:**
```json
{
  "projectId": "uuid",
  "scriptId": "uuid",
  "errors": ["Missing import statement"]
}
```

**Response:**
```json
{
  "fixed": true,
  "updatedContent": "import static com.kms..."
}
```

---

### POST `/functions/v1/validate-artifacts`

AI quality review for requirements or test cases.

**Request:**
```json
{
  "projectId": "uuid",
  "artifactType": "test_cases"
}
```

**Response:**
```json
{
  "issues": [...],
  "score": 85,
  "recommendations": [...]
}
```

---

### POST `/functions/v1/analyze-figma`

Extract screens and UI elements from a Figma file.

**Request:**
```json
{
  "projectId": "uuid",
  "figmaFileUrl": "https://www.figma.com/file/...",
  "figmaApiToken": "figd_..."
}
```

---

### POST `/functions/v1/ingest-source-code`

Process uploaded source code ZIP into chunks and embeddings.

**Request:**
```json
{
  "projectId": "uuid",
  "sourceCodeFileId": "uuid"
}
```

---

### POST `/functions/v1/trigger-katalon-run`

Trigger a test execution via CI/CD webhook.

**Request:**
```json
{
  "projectId": "uuid"
}
```

---

### POST `/functions/v1/receive-test-results`

Webhook endpoint for receiving test execution results.

**Request:**
```json
{
  "callbackToken": "uuid",
  "status": "completed",
  "passed": 95,
  "failed": 5,
  "skipped": 0,
  "results": [...]
}
```

---

## Generation Job Polling

After starting any generation job, poll the `generation_jobs` table:

```sql
SELECT * FROM generation_jobs WHERE id = '<jobId>';
```

**Status values:** `running` | `completed` | `failed`

**Key fields:**
- `percentage` (0-100) — overall progress
- `phase` — current pipeline phase
- `scripts_generated` — count of items generated so far
- `completed_batches` / `total_batches` — batch progress
- `error_message` — populated on failure
- `credits_exhausted` — true if AI quota exceeded
- `partial` — true if completed with some batch failures
