

## Plan: Add Test Level Dimension (System / Integration / UAT) with Coverage Tracking

### The Problem

Currently, the system generates test cases classified by **test type** (Functional, Negative, Boundary, Security, etc.) but has no concept of **test level**. Test types and test levels are orthogonal dimensions:

```text
                    Test Types →
                    Functional  Negative  Boundary  Security  API  ...
Test Levels ↓
  System            ✓           ✓         ✓         ✓        ✓
  Integration       ✓           ✓                              ✓
  UAT               ✓           ✓         ✓
```

A "Functional" test case can exist at the System, Integration, or UAT level. The AI needs to generate and tag test cases across all three levels to ensure full coverage.

### Changes Required

#### 1. Database: Add `test_level` column to `test_cases`
- Add column `test_level text NOT NULL DEFAULT 'system'` with values: `system`, `integration`, `uat`
- No new table needed — it's a property of each test case

#### 2. Edge Function: `generate-test-cases/index.ts`
- Add `test_level` to the tool schema enum: `["System", "Integration", "UAT"]`
- Update the system prompt to instruct the AI to assign appropriate test levels:
  - **System**: Tests that validate individual module/component behavior in isolation
  - **Integration**: Tests that validate interactions between modules, APIs, services, or databases
  - **UAT**: Tests written from the end-user's perspective validating business workflows and acceptance criteria
- Update the E2E pass to default to `integration` or `uat` level
- Update the Coverage Verification pass to check for level gaps (e.g., requirement has system tests but no UAT tests)

#### 3. Edge Function: `enhance-test-cases/index.ts`
- Pass `test_level` through enhancement passes so it's preserved and refined

#### 4. UI: Step3 Generation Page
- Add optional test level selection: let users choose which levels to generate (System, Integration, UAT — all checked by default)
- Pass selected levels to the edge function

#### 5. UI: Coverage Matrix (`CoverageMatrix.tsx`)
- Add a **level filter/toggle** row above the matrix (System | Integration | UAT | All)
- When filtered, show coverage counts only for that level
- Add level columns or a secondary breakdown showing level distribution per requirement
- Update the "Full Coverage" stat to consider level coverage (e.g., a requirement needs at least System + UAT tests)

#### 6. UI: Test Cases page
- Add `test_level` as a filterable column in both card and table views
- Show level badge on each test case card
- Add level to the filter bar alongside existing type/status/priority filters

#### 7. UI: Test Case Filters
- Add a `level` filter dropdown with options: All, System, Integration, UAT

### How Coverage Is Ensured

The AI prompt will explicitly instruct:
1. **Per-Requirement pass**: Generate tests at all applicable levels. For a login requirement: system-level (validate auth service), integration-level (validate auth + session + DB), UAT-level (user can log in and see dashboard)
2. **Coverage Verification pass**: Check each requirement has at least one test at each relevant level. Flag gaps.
3. **E2E pass**: Always tagged as `integration` or `uat` since they span modules
4. **Negative/Security pass**: Typically `system` level but can be `integration` for API contract tests

### Files to Modify
- New migration: add `test_level` column
- `supabase/functions/generate-test-cases/index.ts` — prompt + schema updates
- `supabase/functions/enhance-test-cases/index.ts` — pass through level
- `src/components/wizard/Step3GenerateTestCases.tsx` — level selection UI
- `src/pages/CoverageMatrix.tsx` — level filter + coverage stats
- `src/pages/TestCases.tsx` — level badge display
- `src/components/test-cases/TestCaseFilters.tsx` — level filter
- `src/components/test-cases/useTestCasesState.ts` — level filter state
- `src/components/test-cases/TestCaseCardView.tsx` — level badge
- `src/components/test-cases/TestCaseTableView.tsx` — level column

