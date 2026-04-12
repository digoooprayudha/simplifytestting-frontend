# Integration Plan & API Documentation

Dokumen ini menjelaskan langkah-langkah untuk mengintegrasikan Frontend React dengan AI Backend FastAPI, serta menyediakan dokumentasi teknis untuk semua endpoint API yang tersedia.

---

## Part 1: Integration Plan (Frontend Changes)

Strategi utama adalah mengganti pemanggilan **Supabase Edge Functions** dengan pemanggilan langsung ke **FastAPI Backend** (port 8000).

### 1. Buat API Client Baru (`src/lib/apiClient.ts`)
Kita perlu membuat sebuah helper axios atau fetch yang terfokus ke FastAPI untuk memudahkan pengelolaan URL dan Headers.
- **Tujuan:** Singleton client untuk semua rest call ke Python.
- **Base URL:** `http://localhost:8000`

### 2. Modifikasi Polling Hook (`src/hooks/useGenerationJobPoller.ts`)
Saat ini hook ini membaca tabel `generation_jobs` langsung via Supabase Client.
- **Perubahan:** Ubah polling agar menggunakan endpoint `GET /pipelines/automation/status/{project_id}`.
- **Alasan:** Agar logika status tetap terpusat di backend agentic kita.

### 3. Update Halaman Pipeline Status (`src/pages/PipelineStatus.tsx`)
Halaman ini adalah yang paling banyak melakukan pemanggilan fungsi AI.
- **Target:** Ganti semua `supabase.functions.invoke(...)` dengan `apiClient.post(...)`.
- **Fungsi yang terdampak:** 
  - `generate-test-cases` -> `/pipelines/test-cases`
  - `enhance-test-cases` -> `/pipelines/test-cases` (dengan parameter pass)
  - `generate-katalon` -> `/pipelines/automation`
  - `trigger-katalon-run` -> (Perlu diputuskan apakah tetap di Supabase atau dipindah)

### 4. Update Requirements Manager (`src/pages/RequirementsManager.tsx`)
- **Target:** Implementasikan bulk-delete dan manual add menggunakan endpoint CRUD kita.
- **Fungsi:** `/projects/{project_id}/requirements/bulk-delete`, `/requirements/{id}` (PATCH/DELETE).

---

## Part 2: API Documentation (Backend)

Base URL: `http://localhost:8000`

### 1. General & Health
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` or `/health` | `GET` | Cek status kesehatan server dan sinkronisasi waktu. |
| `/projects/{project_id}/status` | `GET` | Cek kesiapan data project (dokumen, code, figma, req). |

### 2. Requirements Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/projects/{project_id}/requirements` | `GET` | List semua requirement beserta statistik prioritas. |
| `/projects/{project_id}/requirements` | `POST` | Tambah requirement secara manual. |
| `/requirements/{id}` | `PATCH` | Edit requirement secara inline (title, desc, priority). |
| `/requirements/{id}` | `DELETE` | Hapus satu requirement. |
| `/projects/{project_id}/requirements/bulk-delete` | `POST` | Hapus banyak requirement sekaligus. |

### 3. Test Cases Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/projects/{project_id}/test-cases` | `GET` | List semua test case (approved vs pending, pos vs neg). |
| `/projects/{project_id}/test-cases` | `POST` | Tambah test case secara manual. |
| `/test-cases/{id}` | `PATCH` | Edit/Approve test case secara manual. |
| `/test-cases/{id}` | `DELETE` | Hapus satu test case. |
| `/projects/{project_id}/test-cases/bulk-approve` | `POST` | Approve banyak test case sekaligus. |
| `/projects/{project_id}/test-cases/bulk-delete` | `POST` | Hapus banyak test case sekaligus. |

### 4. AI Resource Pipelines (Fase 1-3)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pipelines/ingest-code` | `POST` | Fase 1: Ingest & Chunk source code (Background). |
| `/pipelines/extract-requirements` | `POST` | Fase 2: Ekstrak requirement dari BRD/FSD. |
| `/pipelines/mapping` | `POST` | Fase 3: Mapping Requirements ke Source Code. |
| `/pipelines/validate-requirements`| `POST` | Jalankan AI Agent untuk validasi kualitas req. |

### 5. AI Generation Pipelines (Generator)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pipelines/test-cases` | `POST` | Generate Test Cases (Background). Mendukung per-requirement. |
| `/pipelines/validate-test-cases` | `POST` | Jalankan AI Agent untuk review kualitas Test Case. |
| `/pipelines/automation` | `POST` | Generate Script Katalon (Background). |
| `/pipelines/automation/status/{id}`| `GET` | Cek progres generation (0 - 100%). |
| `/projects/{project_id}/katalon` | `GET` | Ambil hasil generate lengkap (Scripts, PO, Suite). |

### 6. Katalon Quality Agents
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pipelines/katalon/syntax-check` | `POST` | Static syntax check untuk file Groovy yang dihasilkan. |
| `/pipelines/katalon/validate` | `POST` | AI Review (QA Lead) untuk validasi logika script. |

---

> Dokumen ini dibuat otomatis sebagai panduan integrasi. JANGAN RUN APAPUN DULU sebelum menyetujui rencana ini.
