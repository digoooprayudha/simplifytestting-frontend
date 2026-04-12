import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Filters } from "./useTestCasesState";

interface Props {
  filters: Filters;
  updateFilter: (key: keyof Filters, value: string) => void;
  testTypes: string[];
  requirements: { id: string; req_code: string }[];
}

export const TestCaseFilters = ({ filters, updateFilter, testTypes, requirements }: Props) => {
  const hasActiveFilters = filters.search || filters.type !== "all" || filters.status !== "all" || filters.priority !== "all" || filters.requirement !== "all" || filters.level !== "all" || filters.source !== "all" || filters.suite !== "all";

  const clearAll = () => {
    updateFilter("search", "");
    updateFilter("type", "all");
    updateFilter("status", "all");
    updateFilter("priority", "all");
    updateFilter("requirement", "all");
    updateFilter("level", "all");
    updateFilter("source", "all");
    updateFilter("suite", "all");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={e => updateFilter("search", e.target.value)}
          placeholder="Search test cases..."
          className="pl-9 h-8 text-sm"
        />
      </div>
      <Select value={filters.type} onValueChange={v => updateFilter("type", v)}>
        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          {testTypes.map(t => (
            <SelectItem key={t} value={t}>{t === "all" ? "All Types" : t.toUpperCase()}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={v => updateFilter("status", v)}>
        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="generated">Generated</SelectItem>
          <SelectItem value="refined">Refined</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.priority} onValueChange={v => updateFilter("priority", v)}>
        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.level} onValueChange={v => updateFilter("level", v)}>
        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Level" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Levels</SelectItem>
          <SelectItem value="system">System</SelectItem>
          <SelectItem value="integration">Integration</SelectItem>
          <SelectItem value="uat">UAT</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.requirement} onValueChange={v => updateFilter("requirement", v)}>
        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Requirement" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Reqs</SelectItem>
          {requirements.map(r => (
            <SelectItem key={r.id} value={r.id}>{r.req_code}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.source} onValueChange={v => updateFilter("source", v)}>
        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="BRD">BRD</SelectItem>
          <SelectItem value="FSD">FSD</SelectItem>
          <SelectItem value="TDD">TDD</SelectItem>
          <SelectItem value="Figma">Figma</SelectItem>
          <SelectItem value="Source Code">Source Code</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.suite} onValueChange={v => updateFilter("suite", v)}>
        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Suite" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Suites</SelectItem>
          <SelectItem value="Smoke">Smoke</SelectItem>
          <SelectItem value="Regression">Regression</SelectItem>
          <SelectItem value="Security">Security</SelectItem>
          <SelectItem value="NFR-Performance">NFR-Performance</SelectItem>
          <SelectItem value="NFR-Audit">NFR-Audit</SelectItem>
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button size="sm" variant="ghost" onClick={clearAll} className="h-8 gap-1 text-xs text-muted-foreground">
          <X className="w-3 h-3" /> Clear
        </Button>
      )}
    </div>
  );
};
