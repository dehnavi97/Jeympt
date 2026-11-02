import { useMemo, useState } from "react";
import { FolderKanban, LayoutGrid, List, Plus, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAllItems, useProjects } from "@/lib/hooks";
import { useSettings, type ProjectView } from "@/lib/settings";
import { EMPTY_PROGRESS, progressByProject } from "@/lib/workflow";
import { useDialogs } from "@/components/dialogs/DialogsProvider";
import { EmptyState, LoadingRows, PageHeader, Tip } from "@/components/common/ui";
import { ProjectCard, ProjectRow } from "@/components/project/ProjectCard";
import type { ProjectStatus } from "@/lib/types";
import { PROJECT_STATUS_LABEL } from "@/lib/types";

type StatusFilter = "all" | ProjectStatus;
type SortKey = "updated" | "accessed" | "created" | "name" | "progress";
const SORT_LABEL: Record<SortKey, string> = {
  updated: "Last updated",
  accessed: "Recently opened",
  created: "Newest first",
  name: "Name A–Z",
  progress: "Most progress",
};
const FILTERS: StatusFilter[] = ["all", "active", "paused", "completed", "archived"];

export default function Projects() {
  const projects = useProjects();
  const items = useAllItems();
  const { settings } = useSettings();
  const { openProject } = useDialogs();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [favOnly, setFavOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("updated");
  const [view, setView] = useState<ProjectView>(settings.projectView);

  const progress = useMemo(() => progressByProject(items ?? []), [items]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: 0, active: 0, paused: 0, completed: 0, archived: 0 };
    for (const p of projects ?? []) {
      c[p.status]++;
      if (p.status !== "archived") c.all++;
    }
    return c;
  }, [projects]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (projects ?? [])
      .filter((p) => (status === "all" ? p.status !== "archived" : p.status === status))
      .filter((p) => !favOnly || p.favorite)
      .filter((p) => !query || p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query))
      .sort((a, b) => {
        switch (sort) {
          case "name":
            return a.name.localeCompare(b.name);
          case "created":
            return b.createdAt - a.createdAt;
          case "accessed":
            return (b.lastAccessedAt ?? 0) - (a.lastAccessedAt ?? 0);
          case "progress":
            return (progress.get(b.id)?.percent ?? 0) - (progress.get(a.id)?.percent ?? 0);
          default:
            return b.updatedAt - a.updatedAt;
        }
      });
  }, [projects, q, status, favOnly, sort, progress]);

  return (
    <>
      <PageHeader
        title="My Projects"
        subtitle="Each project is an ordered workflow of prompts and notes."
        actions={
          <Button onClick={() => openProject()} data-testid="projects-new-project-button">
            <Plus className="size-4" /> New Project
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1" data-testid="project-status-filter">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatus(f)}
              data-testid={`project-filter-${f}`}
              data-active={status === f || undefined}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                status === f && "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border)]",
              )}
            >
              {f === "all" ? "All" : PROJECT_STATUS_LABEL[f]}
              <span className="font-mono text-[10px] opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects by name or description…" className="pl-8" data-testid="projects-search-input" />
          </div>
          <div className="flex items-center gap-2">
            <Tip label="Favorites only">
              <Button variant={favOnly ? "secondary" : "outline"} size="icon" onClick={() => setFavOnly((v) => !v)} aria-pressed={favOnly} aria-label="Favorites only" data-testid="projects-favorites-toggle">
                <Star className={cn("size-4", favOnly && "fill-amber-400 text-amber-400")} />
              </Button>
            </Tip>
            <Select value={sort} onValueChange={(v: string) => setSort(v as SortKey)}>
              <SelectTrigger className="w-40" data-testid="projects-sort-select">
                <SelectValue>{(v) => SORT_LABEL[v as SortKey]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k} data-testid={`projects-sort-${k}`}>{SORT_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border bg-card p-0.5">
              {(["grid", "list"] as ProjectView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-label={`${v} view`}
                  data-testid={`projects-view-${v}`}
                  className={cn("grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground", view === v && "bg-muted text-foreground")}
                >
                  {v === "grid" ? <LayoutGrid className="size-3.5" /> : <List className="size-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {projects === undefined ? (
        <LoadingRows rows={3} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to start organizing your prompts into an ordered workflow."
          action={<Button onClick={() => openProject()} data-testid="projects-empty-create-button"><Plus className="size-4" /> Create Your First Project</Button>}
          testId="projects-empty-state"
        />
      ) : list.length === 0 ? (
        <EmptyState icon={Search} title="No matching projects" description="Try a different search or filter." testId="projects-no-results" />
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="projects-grid">
          {list.map((p) => (
            <ProjectCard key={p.id} project={p} progress={progress.get(p.id) ?? EMPTY_PROGRESS} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card" data-testid="projects-list">
          {list.map((p) => (
            <ProjectRow key={p.id} project={p} progress={progress.get(p.id) ?? EMPTY_PROGRESS} />
          ))}
        </div>
      )}
    </>
  );
}
