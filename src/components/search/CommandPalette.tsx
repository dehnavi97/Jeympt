import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, FileText, Search, StickyNote } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAllItems, useProjects } from "@/lib/hooks";
import { ProjectIcon, ProjectStatusBadge, PromptStatusBadge } from "@/components/common/ui";
import { useDialogs } from "@/components/dialogs/DialogsProvider";
import type { Project, SequenceItem } from "@/lib/types";

type Result =
  | { kind: "project"; project: Project; snippet: string }
  | { kind: "item"; item: SequenceItem; project?: Project; snippet: string };

function snippetOf(text: string, q: string) {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return "";
  const start = Math.max(0, i - 30);
  return (start > 0 ? "…" : "") + text.slice(start, i + q.length + 60).replace(/\s+/g, " ");
}

export function searchWorkspace(q: string, projects: Project[], items: SequenceItem[]): Result[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const pmap = new Map(projects.map((p) => [p.id, p]));
  const out: Result[] = [];
  for (const p of projects) {
    if (p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query))
      out.push({ kind: "project", project: p, snippet: snippetOf(p.description, query) });
  }
  for (const i of items) {
    const hay = [i.title, i.content, i.description, i.internalNote].join("\n").toLowerCase();
    if (hay.includes(query))
      out.push({
        kind: "item",
        item: i,
        project: pmap.get(i.projectId),
        snippet: snippetOf(i.content, query) || snippetOf(i.description, query),
      });
  }
  return out.slice(0, 40);
}

export default function CommandPalette() {
  const { searchOpen, setSearchOpen } = useDialogs();
  const navigate = useNavigate();
  const projects = useProjects() ?? [];
  const items = useAllItems() ?? [];
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  const results = useMemo(() => searchWorkspace(q, projects, items), [q, projects, items]);
  const recent = useMemo(
    () =>
      [...projects]
        .filter((p) => p.status !== "archived")
        .sort((a, b) => (b.lastAccessedAt ?? b.updatedAt) - (a.lastAccessedAt ?? a.updatedAt))
        .slice(0, 5)
        .map((p): Result => ({ kind: "project", project: p, snippet: "" })),
    [projects],
  );
  const list = q.trim() ? results : recent;

  const go = (r: Result) => {
    setSearchOpen(false);
    setQ("");
    if (r.kind === "project") navigate(`/projects/${r.project.id}`);
    else if (r.item.type === "prompt") navigate(`/projects/${r.item.projectId}/prompts/${r.item.id}`);
    else navigate(`/projects/${r.item.projectId}?focus=${r.item.id}`);
  };

  return (
    <Dialog open={searchOpen} onOpenChange={(o) => { setSearchOpen(o); if (!o) setQ(""); }}>
      <DialogContent
        className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
        data-testid="command-palette"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, list.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && list[active]) {
                e.preventDefault();
                go(list[active]);
              }
            }}
            placeholder="Search projects, prompts, content and notes…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            data-testid="global-search-input"
          />
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-1.5" data-testid="global-search-results">
          {!q.trim() && list.length > 0 && (
            <div className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Recent projects
            </div>
          )}
          {list.map((r, idx) => (
            <button
              key={r.kind === "project" ? `p-${r.project.id}` : `i-${r.item.id}`}
              type="button"
              onMouseEnter={() => setActive(idx)}
              onClick={() => go(r)}
              data-testid={`search-result-${r.kind === "project" ? r.project.id : r.item.id}`}
              className={cn(
                "flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                idx === active && "bg-muted",
              )}
            >
              {r.kind === "project" ? (
                <ProjectIcon icon={r.project.icon} color={r.project.color} size="sm" />
              ) : (
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground">
                  {r.item.type === "prompt" ? <FileText className="size-3.5" /> : <StickyNote className="size-3.5" />}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium">
                    {r.kind === "project" ? r.project.name : r.item.title}
                  </span>
                  {r.kind === "project" ? (
                    <ProjectStatusBadge status={r.project.status} />
                  ) : r.item.type === "prompt" ? (
                    <PromptStatusBadge status={r.item.status} />
                  ) : (
                    <span className="rounded border px-1 text-[10px] text-muted-foreground">Note</span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {r.kind === "item" && r.project ? `${r.project.name}${r.snippet ? " · " : ""}` : ""}
                  {r.snippet}
                </span>
              </span>
              {idx === active && <CornerDownLeft className="mt-1 size-3.5 text-muted-foreground" />}
            </button>
          ))}
          {q.trim() && list.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground" data-testid="global-search-empty">
              No results for “{q}”
            </div>
          )}
          {!q.trim() && list.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Start typing to search your workspace.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
