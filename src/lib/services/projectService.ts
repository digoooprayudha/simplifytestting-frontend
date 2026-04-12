/**
 * Project-level database operations.
 * Encapsulates all Supabase calls related to project CRUD so that
 * components never talk to `supabase` directly for these operations.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ProjectWithStats } from "@/lib/types";

/**
 * Fetch all projects with aggregated stats (documents, requirements,
 * test cases, katalon scripts).
 */
export async function fetchProjectsWithStats(): Promise<ProjectWithStats[]> {
  const { data: allProjects } = await supabase
    .from("project_settings")
    .select("*")
    .order("created_at", { ascending: false });

  if (!allProjects) return [];

  const [docsRes, reqsRes, ksRes] = await Promise.all([
    supabase.from("documents").select("project_id"),
    supabase.from("requirements").select("id, project_id"),
    supabase.from("katalon_scripts").select("project_id"),
  ]);

  const countBy = (items: any[] | null, key: string) => {
    const map: Record<string, number> = {};
    (items || []).forEach((i) => {
      const k = i[key];
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return map;
  };

  const docCounts = countBy(docsRes.data, "project_id");
  const reqCounts = countBy(reqsRes.data, "project_id");
  const ksCounts  = countBy(ksRes.data, "project_id");

  // Test case counts per project via requirement IDs
  const allReqIds = (reqsRes.data || []).map((r: any) => r.id);
  const tcByProject: Record<string, number> = {};

  if (allReqIds.length > 0) {
    const reqToProject: Record<string, string> = {};
    (reqsRes.data || []).forEach((r: any) => {
      reqToProject[r.id] = r.project_id;
    });

    let allTcs: any[] = [];
    for (let i = 0; i < allReqIds.length; i += 200) {
      const batch = allReqIds.slice(i, i + 200);
      const { data } = await supabase
        .from("test_cases")
        .select("requirement_id")
        .in("requirement_id", batch);
      allTcs = allTcs.concat(data || []);
    }
    allTcs.forEach((tc: any) => {
      const pid = reqToProject[tc.requirement_id];
      if (pid) tcByProject[pid] = (tcByProject[pid] || 0) + 1;
    });
  }

  return allProjects.map((p) => ({
    ...p,
    documents: docCounts[p.id] || 0,
    requirements: reqCounts[p.id] || 0,
    testCases: tcByProject[p.id] || 0,
    katalonScripts: ksCounts[p.id] || 0,
  }));
}

/**
 * Delete a project and ALL related data (cascade).
 * Order matters because of foreign-key references.
 */
export async function deleteProjectCascade(projectId: string): Promise<void> {
  // 1. Get requirement IDs for this project
  const { data: reqs } = await supabase
    .from("requirements")
    .select("id")
    .eq("project_id", projectId);

  const reqIds = (reqs || []).map((r: any) => r.id);

  // 2. Delete test_cases & figma mappings via requirement IDs
  if (reqIds.length > 0) {
    await supabase.from("requirement_figma_mappings").delete().in("requirement_id", reqIds);
    await supabase.from("test_cases").delete().in("requirement_id", reqIds);
  }

  // 3. Delete all project-scoped tables in parallel
  await Promise.all([
    supabase.from("katalon_scripts").delete().eq("project_id", projectId),
    supabase.from("katalon_objects").delete().eq("project_id", projectId),
    supabase.from("katalon_suites").delete().eq("project_id", projectId),
    supabase.from("generation_jobs").delete().eq("project_id", projectId),
    supabase.from("test_runs").delete().eq("project_id", projectId),
    supabase.from("source_code_files").delete().eq("project_id", projectId),
    supabase.from("custom_ai_models").delete().eq("project_id", projectId),
  ]);

  // 4. Delete remaining project data
  await supabase.from("requirements").delete().eq("project_id", projectId);
  await supabase.from("document_chunks").delete().eq("project_id", projectId);
  await supabase.from("documents").delete().eq("project_id", projectId);
  await supabase.from("figma_screens").delete().eq("project_id", projectId);

  // 5. Finally delete the project itself
  await supabase.from("project_settings").delete().eq("id", projectId);
}
