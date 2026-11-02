import { useMemo, useState } from "react";
import { MessageSquareText, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAllItems, useProjects } from "@/lib/hooks";
import { indexItems, promptState } from "@/lib/workflow";
import { EmptyState, LoadingRows, PageHeader, Tip } from "@/components/common/ui";
import { PromptRow } from "@/components/project/PromptRow";
import type { PromptStatus } from "@/lib/types";
import { PROMPT_STATUSES, PROMPT_STATUS_LABEL } from "@/lib/types";

type StatusFilter = "all" | "waiting" | PromptStatus;
const STATUS_LABEL: Record<StatusFilter, string> = { all: "Any status", waiting: "Blocked by dependencies", ...PROMPT_STATUS_LABEL };

export default function AllPrompts() {
  const items = useAllItems();
  const projects = useProjects();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [projectId, setProjectId] = useState("all");
  const [favOnly, setFavOnly] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  const pmap = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);
  const byId = useMemo(() => indexItems(items ?? []), [items]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (items ?? [])
      .filter((i) => i.type === "prompt")
      .filter((i) => {
        const p = pmap.get(i.projectId);
        if (!p) return false;
        if (!includeArchived && p.status === "archived" && projectId === "all") return false;
        if (projectId !== "all" && i.projectId !== projectId) return false;
        if (favOnly && !i.favorite) return false;
        if (status === "waiting") {
          const s = promptState(i, byId);
          if (!(s.unmetDeps.length > 0 && !s.done)) return false;
        } else if (status !== "all" && i.status !== status) return false;
        if (query && ![i.title, i.content, i.description, i.internalNote].join("\n").toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [items, pmap, byId, q, status, projectId, favOnly, includeArchived]);

  const projectOptions = (projects ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader title="All Prompts" subtitle="Every prompt across your projects, searchable by title and full content." />
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles and prompt content…" className="pl-8" data-testid="all-prompts-search-input" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={(v: string) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-44" data-testid="all-prompts-status-filter">
              <SelectValue>{(v) => STATUS_LABEL[v as StatusFilter]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(["all", ...PROMPT_STATUSES, "waiting"] as StatusFilter[]).map((s) => (
                <SelectItem key={s} value={s} data-testid={`all-prompts-status-${s}`}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectId} onValueChange={(v: string) => setProjectId(v)}>
            <SelectTrigger className="w-44" data-testid="all-prompts-project-filter">
              <SelectValue>{(v) => (v === "all" ? "All projects" : (pmap.get(v as string)?.name ?? "Project"))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projectOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tip label="Favorites only">
            <Button variant={favOnly ? "secondary" : "outline"} size="icon" onClick={() => setFavOnly((v) => !v)} aria-pressed={favOnly} aria-label="Favorites only" data-testid="all-prompts-favorites-toggle">
              <Star className={cn("size-4", favOnly && "fill-amber-400 text-amber-400")} />
            </Button>
          </Tip>
          <Button variant={includeArchived ? "secondary" : "outline"} size="sm" onClick={() => setIncludeArchived((v) => !v)} aria-pressed={includeArchived} data-testid="all-prompts-archived-toggle">
            {includeArchived ? "Showing archived" : "Include archived"}
          </Button>
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground" data-testid="all-prompts-count">{list.length} prompt{list.length === 1 ? "" : "s"}</div>
      {items === undefined ? (
        <LoadingRows />
      ) : list.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={items.some((i) => i.type === "prompt") ? "No prompts match" : "No prompts yet"}
          description={items.some((i) => i.type === "prompt") ? "Adjust the search or filters." : "Open a project and add your first prompt."}
          testId="all-prompts-empty"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card" data-testid="all-prompts-list">
          {list.map((i) => (
            <PromptRow key={i.id} item={i} project={pmap.get(i.projectId)} state={promptState(i, byId)} />
          ))}
        </div>
      )}
    </>
  );
}
