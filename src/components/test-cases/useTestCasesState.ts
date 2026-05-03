import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import type { Tables } from "@/integrations/supabase/types";

export type TestCase = Tables<"test_cases"> & { requirements?: { req_code: string } | null };

export interface Filters {
  search: string;
  type: string;
  status: string;
  priority: string;
  requirement: string;
  level: string;
  source: string;
  suite: string;
}

export const useTestCasesState = (projectId?: string) => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<{ id: string; req_code: string }[]>([]);
  const [filters, setFilters] = useState<Filters>({ search: "", type: "all", status: "all", priority: "all", requirement: "all", level: "all", source: "all", suite: "all" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchTestCases = useCallback(async () => {
    setLoading(true);
    if (!projectId) { setTestCases([]); setLoading(false); return; }
    try {
      const response = await apiClient.get<{ test_cases: TestCase[] }>(`/projects/${projectId}/test-cases`);
      setTestCases(response.test_cases || []);
    } catch (error) {
      toast.error("Failed to load test cases");
    }
    setLoading(false);
  }, [projectId]);

  const fetchRequirements = useCallback(async () => {
    if (!projectId) { setRequirements([]); return; }
    try {
      const response = await apiClient.get<{ requirements: { id: string, req_code: string }[] }>(`/projects/${projectId}/requirements`);
      setRequirements(response.requirements || []);
    } catch (error) {
      console.error("Failed to fetch requirements for filters");
    }
  }, [projectId]);

  useEffect(() => { fetchTestCases(); fetchRequirements(); }, [fetchTestCases, fetchRequirements]);

  // Filtered results
  const filteredCases = useMemo(() => {
    let result = testCases;
    const { search, type, status, priority, requirement } = filters;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(tc =>
        tc.title.toLowerCase().includes(q) ||
        tc.tc_code.toLowerCase().includes(q) ||
        (tc.description || "").toLowerCase().includes(q) ||
        tc.steps.toLowerCase().includes(q) ||
        tc.expected_result.toLowerCase().includes(q)
      );
    }
    if (type !== "all") result = result.filter(tc => (tc.test_type || "functional") === type);
    if (status !== "all") result = result.filter(tc => tc.status === status);
    if (priority !== "all") result = result.filter(tc => tc.priority === priority);
    if (requirement !== "all") result = result.filter(tc => tc.requirement_id === requirement);
    if (filters.level !== "all") result = result.filter(tc => (tc.test_level || "system") === filters.level);
    if (filters.source !== "all") result = result.filter(tc => ((tc as any).source || "BRD") === filters.source);
    if (filters.suite !== "all") result = result.filter(tc => ((tc as any).test_suite || "Regression") === filters.suite);

    return result;
  }, [testCases, filters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCases.length / pageSize));
  const paginatedCases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, page, pageSize]);

  // Reset page on filter change
  const updateFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const updatePageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  // Selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const pageIds = paginatedCases.map(tc => tc.id);
    const allSelected = pageIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [paginatedCases, selectedIds]);

  // Expand/Collapse
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(paginatedCases.map(tc => tc.id)));
  }, [paginatedCases]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // CRUD operations
  const saveEdit = useCallback(async (id: string, editForm: Record<string, any>) => {
    try {
      await apiClient.patch(`/test-cases/${id}`, { ...editForm, status: "refined" });
      setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, ...editForm, status: "refined" } : tc));
      toast.success("Test case refined");
      return true;
    } catch (error) {
      toast.error("Save failed");
      return false;
    }
  }, []);

  const approveCase = useCallback(async (id: string) => {
    const tc = testCases.find(t => t.id === id);
    if (!tc) return;
    const newStatus = tc.status === "approved" ? "generated" : "approved";
    try {
      await apiClient.patch(`/test-cases/${id}`, { status: newStatus });
      setTestCases(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      if (newStatus === "approved") toast.success("Approved");
      else toast.info("Approval removed");
    } catch (error) {
      toast.error("Failed to update status");
    }
  }, [testCases]);

  const deleteCase = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/test-cases/${id}`);
      setTestCases(prev => prev.filter(tc => tc.id !== id));
      toast.success("Deleted");
    } catch (error) {
      toast.error("Delete failed");
    }
  }, []);

  const approveAll = useCallback(async () => {
    const pending = testCases.filter(tc => tc.status !== "approved");
    if (pending.length === 0) return;
    try {
      const ids = pending.map(tc => tc.id);
      await apiClient.post(`/projects/${projectId}/test-cases/bulk-approve`, { test_case_ids: ids });
      setTestCases(prev => prev.map(tc => ({ ...tc, status: "approved" })));
      toast.success("All test cases approved");
    } catch (error) {
      toast.error("Bulk approval failed");
    }
  }, [testCases, projectId]);

  // Bulk operations
  const bulkApprove = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      await apiClient.post(`/projects/${projectId}/test-cases/bulk-approve`, { test_case_ids: ids });
      setTestCases(prev => prev.map(tc => ids.includes(tc.id) ? { ...tc, status: "approved" } : tc));
      setSelectedIds(new Set());
      toast.success(`${ids.length} test cases approved`);
    } catch (error) {
      toast.error("Bulk approval failed");
    }
  }, [selectedIds, projectId]);

  const bulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      await apiClient.post(`/projects/${projectId}/test-cases/bulk-delete`, { test_case_ids: ids });
      setTestCases(prev => prev.filter(tc => !ids.includes(tc.id)));
      setSelectedIds(new Set());
      toast.success(`${ids.length} test cases deleted`);
    } catch (error) {
      toast.error("Bulk delete failed");
    }
  }, [selectedIds, projectId]);

  const bulkChangeStatus = useCallback(async (status: string) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      // Re-use bulk approve pattern or general update if backend supports it
      for (const id of ids) {
        await apiClient.patch(`/test-cases/${id}`, { status });
      }
      setTestCases(prev => prev.map(tc => ids.includes(tc.id) ? { ...tc, status } : tc));
      setSelectedIds(new Set());
      toast.success(`${ids.length} test cases updated to ${status}`);
    } catch (error) {
      toast.error("Bulk status update failed");
    }
  }, [selectedIds]);

  const addTestCase = useCallback(async (addForm: any) => {
    try {
      const response = await apiClient.post<{ id: string }> (`/projects/${projectId}/test-cases`, addForm);
      const newTestCase = { 
        ...addForm, 
        id: response.id, 
        tc_code: addForm.tc_code, 
        status: "approved",
        created_at: new Date().toISOString()
      } as unknown as TestCase;
      setTestCases(prev => [...prev, newTestCase]);
      toast.success("Test case added");
      return true;
    } catch (error) {
      toast.error("Failed to add test case");
      return false;
    }
  }, [projectId]);

  // Stats
  const stats = useMemo(() => {
    const approvedCount = testCases.filter(tc => tc.status === "approved").length;
    return {
      total: testCases.length,
      approved: approvedCount,
      pending: testCases.length - approvedCount,
    };
  }, [testCases]);

  const testTypes = useMemo(() => ["all", ...new Set(testCases.map(tc => tc.test_type || "functional"))], [testCases]);

  return {
    testCases, loading, requirements, filters, updateFilter,
    page, setPage, pageSize, updatePageSize, totalPages,
    filteredCases, paginatedCases,
    selectedIds, toggleSelect, toggleSelectAll,
    expandedIds, toggleExpand, expandAll, collapseAll,
    viewMode, setViewMode,
    saveEdit, approveCase, deleteCase, approveAll,
    bulkApprove, bulkDelete, bulkChangeStatus,
    addTestCase, stats, testTypes, fetchTestCases,
  };
};
