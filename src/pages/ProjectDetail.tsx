import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileText,
  FolderX,
  Lock,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Star,
  StickyNote,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { useProject, useProjectItems } from "@/lib/hooks";
import { markProjectAccessed, setProjectStatus, toggleProjectFavorite } from "@/lib/ops";
import { indexItems, nextActionable, progressOf, promptNumbers, promptState } from "@/lib/workflow";
import { colorHex } from "@/lib/projectStyle";
import { fullDate, pad2, timeAgo } from "@/lib/format";
import { useDialogs } from "@/components/dialogs/DialogsProvider";
import { EmptyState, LoadingRows, PageHeader, ProgressBar, ProjectIcon, Tip } from "@/components/common/ui";
import { ProjectMenu } from "@/components/project/ProjectCard";
import SequenceList from "@/components/project/SequenceList";
import AttachmentsManager from "@/components/attachments/AttachmentsManager";
import type { ProjectStatus, PromptStatus } from "@/lib/types";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, PROMPT_STATUSES, PROMPT_STATUS_LABEL } from "@/lib/types";

type ItemFilter = "all" | "notes" | "waiting" | PromptStatus;
const FILTER_LABEL: Record<ItemFilter, string> = {
  all: "All items",
  notes: "Notes only",
  waiting: "Blocked by dependencies",
  ...PROMPT_STATUS_LABEL,
};

export default function ProjectDetail() {
  const { projectId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const items = useProjectItems(projectId);
  const { openProject, openPrompt, openNote } = useDialogs();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [favOnly, setFavOnly] = useState(false);
  const [collapseAll, setCollapseAll] = useState<{ value: boolean; nonce: number } | null>(null);
  const projectAttachmentCount = useLiveQuery(
    () => db.attachments.where("projectId").equals(projectId).filter((a) => a.itemId === null).count(),
    [projectId],
  );

  useEffect(() => {
    if (projectId) void markProjectAccessed(projectId);
  }, [projectId]);

  const progress = useMemo(() => progressOf(items ?? []), [items]);
  const next = useMemo(() => nextActionable(items ?? []), [items]);
  const numbers = useMemo(() => promptNumbers(items ?? []), [items]);

  const visibleIds = useMemo(() => {
    if (!items) return null;
    const query = q.trim().toLowerCase();
    if (!query && filter === "all" && !favOnly) return null;
    const byId = indexItems(items);
    return new Set(
      items
        .filter((i) => {
          if (query && ![i.title, i.content, i.description, i.internalNote].join("\n").toLowerCase().includes(query)) return false;
          if (favOnly && !i.favorite) return false;
          if (filter === "all") return true;
          if (filter === "notes") return i.type === "note";
          if (i.type !== "prompt") return false;
          if (filter === "waiting") return promptState(i, byId).unmetDeps.length > 0 && !promptState(i, byId).done;
          return i.status === filter;
        })
        .map((i) => i.id),
    );
  }, [items, q, filter, favOnly]);

  if (project === undefined || items === undefined) return <LoadingRows rows={4} />;
  if (project === null)
    return (
      <EmptyState
        icon={FolderX}
        title="Project not found"
        description="It may have been deleted. Your other projects are safe."
        action={<Link to="/projects" className={buttonVariants({ variant: "outline" })} data-testid="project-not-found-back">Back to projects</Link>}
        testId="project-not-found"
      />
    );

  const promptCount = items.filter((i) => i.type === "prompt").length;
  const noteCount = items.length - promptCount;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "My Projects", to: "/projects" }, { label: project.name }]}
        leading={<ProjectIcon icon={project.icon} color={project.color} size="lg" />}
        title={project.name}
        subtitle={project.description || <span className="italic opacity-70">No description</span>}
        actions={
          <>
            <Tip label={project.favorite ? "Remove from favorites" : "Add to favorites"}>
              <Button variant="outline" size="icon" onClick={() => void toggleProjectFavorite(project.id)} aria-label="Toggle favorite" data-testid="project-detail-favorite">
                <Star className={cn("size-4", project.favorite && "fill-amber-400 text-amber-400")} />
              </Button>
            </Tip>
            <Button variant="outline" onClick={() => openProject(project)} data-testid="project-detail-edit">
              <Pencil className="size-3.5" /> Edit
            </Button>
            <Button variant="outline" onClick={() => openNote({ projectId })} data-testid="project-add-note-button">
              <StickyNote className="size-3.5" /> Add note
            </Button>
            <Button onClick={() => openPrompt({ projectId })} data-testid="project-add-prompt-button">
              <Plus className="size-4" /> Add prompt
            </Button>
            <ProjectMenu project={project} onDeleted={() => navigate("/projects")} />
          </>
        }
      />

      <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[1fr_auto] md:items-center" data-testid="project-summary">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              <span className="font-mono font-semibold text-foreground" data-testid="project-progress-text">{progress.done}/{progress.total}</span> prompts done · {progress.sent} sent · {progress.completed} completed · {progress.blocked} blocked
            </span>
            <span className="font-mono font-semibold text-foreground" data-testid="project-progress-percent">{progress.percent}%</span>
          </div>
          <ProgressBar value={progress.percent} color={colorHex(project.color)} testId="project-progress-bar" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>Created {fullDate(project.createdAt)}</span>
            <span>Updated {timeAgo(project.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {next ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("jeympt:highlight", { detail: next.id }))}
              className="flex max-w-xs items-center gap-2 rounded-lg border border-brand/30 bg-brand-subtle/60 px-3 py-1.5 text-left text-xs transition-colors hover:bg-brand-subtle"
              data-testid="project-next-up"
            >
              <span className="font-semibold text-brand-foreground">Next: {pad2(numbers.get(next.id) ?? 0)}</span>
              <span className="truncate">{next.title}</span>
              <ArrowRight className="size-3 shrink-0" />
            </button>
          ) : progress.total > 0 && progress.pending > 0 ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200" data-testid="project-all-blocked">
              <Lock className="size-3" /> Remaining prompts are blocked
            </span>
          ) : null}
          <Select value={project.status} onValueChange={(v: string) => void setProjectStatus(project.id, v as ProjectStatus)}>
            <SelectTrigger size="sm" className="w-32" data-testid="project-detail-status-select">
              <SelectValue>{(v) => PROJECT_STATUS_LABEL[v as ProjectStatus]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s} data-testid={`project-detail-status-${s}`}>{PROJECT_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="sequence" className="gap-4">
        <TabsList variant="line" data-testid="project-tabs">
          <TabsTrigger value="sequence" data-testid="project-tab-sequence">
            <FileText className="size-3.5" /> Sequence <span className="font-mono text-[10px] opacity-70">{items.length}</span>
          </TabsTrigger>
          <TabsTrigger value="attachments" data-testid="project-tab-attachments">
            <Paperclip className="size-3.5" /> Project files <span className="font-mono text-[10px] opacity-70">{projectAttachmentCount ?? 0}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sequence" className="space-y-3">
          {items.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prompts and notes in this project…" className="pl-8" data-testid="project-items-search-input" />
              </div>
              <div className="flex items-center gap-2">
                <Select value={filter} onValueChange={(v: string) => setFilter(v as ItemFilter)}>
                  <SelectTrigger className="w-48" data-testid="project-items-filter-select">
                    <SelectValue>{(v) => FILTER_LABEL[v as ItemFilter]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(["all", ...PROMPT_STATUSES, "waiting", "notes"] as ItemFilter[]).map((f) => (
                      <SelectItem key={f} value={f} data-testid={`project-items-filter-${f}`}>{FILTER_LABEL[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Tip label="Favorites only">
                  <Button variant={favOnly ? "secondary" : "outline"} size="icon" onClick={() => setFavOnly((v) => !v)} aria-label="Favorites only" data-testid="project-items-favorites-toggle">
                    <Star className={cn("size-4", favOnly && "fill-amber-400 text-amber-400")} />
                  </Button>
                </Tip>
                <Tip label="Collapse all">
                  <Button variant="outline" size="icon" onClick={() => setCollapseAll({ value: true, nonce: Date.now() })} aria-label="Collapse all" data-testid="project-collapse-all">
                    <ChevronsDownUp className="size-4" />
                  </Button>
                </Tip>
                <Tip label="Expand all">
                  <Button variant="outline" size="icon" onClick={() => setCollapseAll({ value: false, nonce: Date.now() })} aria-label="Expand all" data-testid="project-expand-all">
                    <ChevronsUpDown className="size-4" />
                  </Button>
                </Tip>
              </div>
            </div>
          )}
          {items.length > 0 && (
            <p className="text-[11px] text-muted-foreground" data-testid="sequence-hint">
              {promptCount} prompt{promptCount === 1 ? "" : "s"} · {noteCount} note{noteCount === 1 ? "" : "s"}
              {visibleIds ? " · Filter active — drag & drop is paused" : " · Drag the handle to reorder, hover between items to insert"}
            </p>
          )}

          {items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="This project has no prompts yet"
              description="Add the first prompt of your workflow. You can insert notes between prompts and define prerequisites later."
              action={
                <div className="flex gap-2">
                  <Button onClick={() => openPrompt({ projectId })} data-testid="sequence-empty-add-prompt"><Plus className="size-4" /> Add first prompt</Button>
                  <Button variant="outline" onClick={() => openNote({ projectId })} data-testid="sequence-empty-add-note"><StickyNote className="size-4" /> Add note</Button>
                </div>
              }
              testId="sequence-empty-state"
            />
          ) : visibleIds && visibleIds.size === 0 ? (
            <EmptyState icon={Search} title="No matching items" description="Try a different search term or filter." testId="sequence-no-results" />
          ) : (
            <SequenceList projectId={projectId} items={items} visibleIds={visibleIds} focusId={params.get("focus")} collapseAll={collapseAll} />
          )}
        </TabsContent>

        <TabsContent value="attachments">
          <div className="rounded-xl border bg-card p-4">
            <AttachmentsManager projectId={projectId} itemId={null} title="Project files" />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
