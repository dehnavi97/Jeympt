import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  Copy,
  CopyPlus,
  FileX,
  Link2,
  Lock,
  RotateCcw,
  Save,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProject, useProjectItems } from "@/lib/hooks";
import { deleteItem, duplicateItem, setPromptStatus, toggleItemFavorite, updateItem, type PromptInput } from "@/lib/ops";
import { copyAndMarkSent, copyOnly } from "@/lib/promptActions";
import { indexItems, isDone, nextActionable, promptNumbers, promptState } from "@/lib/workflow";
import { fullDate, pad2 } from "@/lib/format";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { EmptyState, LoadingRows, PageHeader, PromptStatusBadge, Tip } from "@/components/common/ui";
import { PromptFields, promptDirty, promptFromItem, validatePrompt } from "@/components/project/PromptFields";
import AttachmentsManager from "@/components/attachments/AttachmentsManager";

const draftKey = (id: string) => `jeympt.draft.${id}`;

export default function PromptEditor() {
  const { projectId = "", promptId = "" } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const project = useProject(projectId);
  const items = useProjectItems(projectId);
  const item = items?.find((i) => i.id === promptId && i.type === "prompt");
  const saved = useMemo(() => (item ? promptFromItem(item) : null), [item]);
  const [draft, setDraft] = useState<PromptInput | null>(null);
  const [restored, setRestored] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // initialise the draft once per prompt — restoring unsaved local edits if any
  useEffect(() => {
    setDraft(null);
    setRestored(false);
    setErrors({});
  }, [promptId]);
  useEffect(() => {
    if (!saved || draft) return;
    try {
      const raw = localStorage.getItem(draftKey(promptId));
      const stored = raw ? (JSON.parse(raw) as PromptInput) : null;
      if (stored && promptDirty(stored, saved)) {
        setDraft(stored);
        setRestored(true);
        return;
      }
    } catch {
      /* ignore corrupt draft */
    }
    setDraft(saved);
  }, [saved, draft, promptId]);

  // external changes (status set via Copy & Mark as Sent, etc.) flow into the draft
  const prevSaved = useRef<PromptInput | null>(null);
  useEffect(() => {
    const prevS = prevSaved.current;
    prevSaved.current = saved;
    if (!saved || !prevS || !draft) return;
    if (!promptDirty(draft, prevS)) setDraft(saved);
    else if (saved.status !== prevS.status) setDraft({ ...draft, status: saved.status });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const dirty = !!draft && !!saved && promptDirty(draft, saved);

  // persist unsaved edits so navigation or a crash never loses work
  useEffect(() => {
    if (!draft) return;
    if (dirty) localStorage.setItem(draftKey(promptId), JSON.stringify(draft));
    else localStorage.removeItem(draftKey(promptId));
  }, [draft, dirty, promptId]);

  useEffect(() => {
    if (!dirty) return;
    const fn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);

  const save = async (): Promise<boolean> => {
    if (!draft) return false;
    const e = validatePrompt(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please fix the highlighted fields");
      return false;
    }
    setSaving(true);
    try {
      await updateItem(promptId, draft);
      localStorage.removeItem(draftKey(promptId));
      setRestored(false);
      toast.success("Prompt saved");
      return true;
    } catch (err) {
      setErrors({ dependsOn: err instanceof Error ? err.message : "Could not save" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) void save();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });

  if (items === undefined || project === undefined) return <LoadingRows rows={4} />;
  if (!item || !project || !draft || !saved)
    return (
      <EmptyState
        icon={FileX}
        title="Prompt not found"
        description="It may have been deleted."
        action={<Link to={project ? `/projects/${projectId}` : "/projects"} className={buttonVariants({ variant: "outline" })}>Back</Link>}
        testId="prompt-not-found"
      />
    );

  const byId = indexItems(items);
  const state = promptState(item, byId);
  const numbers = promptNumbers(items);
  const prompts = items.filter((i) => i.type === "prompt");
  const idx = prompts.findIndex((p) => p.id === item.id);
  const prev = prompts[idx - 1];
  const nextP = prompts[idx + 1];
  const dependents = prompts.filter((p) => p.dependsOn.includes(item.id));
  const isNext = nextActionable(items)?.id === item.id;

  const guardNav = async (to: string) => {
    // drafts are kept locally, but still make leaving with unsaved edits explicit
    if (dirty && !(await confirm({ title: "Leave with unsaved changes?", description: "Your draft is kept on this device and restored when you come back.", confirmLabel: "Leave", force: true }))) return;
    navigate(to);
  };

  const withSaved = async (fn: () => Promise<unknown>) => {
    if (dirty && !(await save())) return;
    await fn();
  };

  const remove = async () => {
    if (!(await confirm({ title: `Delete prompt “${item.title}”?`, description: "Its attachments are removed too." }))) return;
    localStorage.removeItem(draftKey(promptId));
    await deleteItem(item.id);
    toast.success("Prompt deleted");
    navigate(`/projects/${projectId}`);
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "My Projects", to: "/projects" }, { label: project.name, to: `/projects/${projectId}` }, { label: `Prompt ${pad2(numbers.get(item.id) ?? 0)}` }]}
        title={
          <span className="flex items-center gap-2">
            <span className="font-mono text-base text-muted-foreground">{pad2(numbers.get(item.id) ?? 0)}</span>
            {saved.title}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {state.blocked && state.unmetDeps.length ? <PromptStatusBadge status={item.status} waiting /> : <PromptStatusBadge status={item.status} testId="editor-status-badge" />}
            {isNext && <span className="rounded-md bg-brand px-1.5 text-[10px] font-semibold text-white uppercase">Next up</span>}
            {dirty ? <span className="text-amber-600 dark:text-amber-400" data-testid="editor-unsaved-indicator">Unsaved changes</span> : <span data-testid="editor-saved-indicator">All changes saved</span>}
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="icon" onClick={() => void guardNav(`/projects/${projectId}`)} aria-label="Back to project" data-testid="editor-back-button">
              <ArrowLeft className="size-4" />
            </Button>
            <Tip label={item.favorite ? "Remove from favorites" : "Add to favorites"}>
              <Button variant="outline" size="icon" onClick={() => void toggleItemFavorite(item.id)} aria-label="Toggle favorite" data-testid="editor-favorite-button">
                <Star className={cn("size-4", item.favorite && "fill-amber-400 text-amber-400")} />
              </Button>
            </Tip>
            <Button variant="outline" disabled={!dirty} onClick={() => { setDraft(saved); setErrors({}); setRestored(false); }} data-testid="editor-revert-button">
              <RotateCcw className="size-3.5" /> Revert
            </Button>
            <Button disabled={!dirty || saving} onClick={() => void save()} data-testid="editor-save-button">
              <Save className="size-3.5" /> Save
            </Button>
          </>
        }
      />

      {restored && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200" data-testid="editor-restored-banner">
          Restored unsaved changes from your last editing session.
          <button type="button" className="font-medium underline" onClick={() => { setDraft(saved); setRestored(false); }} data-testid="editor-discard-draft">
            Discard draft
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border bg-card p-4 md:p-5">
          <PromptFields value={draft} onChange={setDraft} errors={errors} items={items} itemId={item.id} tall />
        </div>

        <aside className="space-y-4">
          <section className="space-y-3 rounded-xl border bg-card p-4" data-testid="editor-actions-panel">
            <h3 className="text-sm font-semibold">Execute</h3>
            {state.blocked && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200" data-testid="editor-blocked-reason">
                <Lock className="mt-0.5 size-3.5 shrink-0" /> {state.blockedReason}
              </div>
            )}
            {!state.done && (
              <Button className={cn("w-full", isNext && "animate-next-pulse")} disabled={state.blocked} onClick={() => void withSaved(async () => { const fresh = { ...item, content: draft.content }; await copyAndMarkSent(fresh); })} data-testid="editor-copy-send-button">
                <Send className="size-3.5" /> Copy & Mark as Sent
              </Button>
            )}
            {item.status === "sent" && (
              <Button variant="outline" className="w-full" onClick={() => void setPromptStatus(item.id, "completed")} data-testid="editor-mark-completed-button">
                <CheckCheck className="size-3.5" /> Mark completed
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => void copyOnly({ ...item, content: draft.content })} data-testid="editor-copy-only-button">
              <Copy className="size-3.5" /> Copy only
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Jeympt never sends prompts anywhere. “Sent” is your own confirmation that you pasted it into an external AI tool.
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t pt-3 text-[11px]">
              <dt className="text-muted-foreground">Created</dt><dd>{fullDate(item.createdAt)}</dd>
              <dt className="text-muted-foreground">Modified</dt><dd>{fullDate(item.updatedAt)}</dd>
              <dt className="text-muted-foreground">Sent</dt><dd data-testid="editor-sent-at">{fullDate(item.sentAt)}</dd>
              <dt className="text-muted-foreground">Completed</dt><dd>{fullDate(item.completedAt)}</dd>
            </dl>
          </section>

          <section className="space-y-2 rounded-xl border bg-card p-4" data-testid="editor-dependencies-panel">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Link2 className="size-3.5" /> Dependencies</h3>
            {item.dependsOn.length === 0 ? (
              <p className="text-xs text-muted-foreground">No prerequisites.</p>
            ) : (
              <ul className="space-y-1">
                {item.dependsOn.map((d) => byId.get(d)).filter((d) => !!d).map((d) => (
                  <li key={d!.id}>
                    <Link to={`/projects/${projectId}/prompts/${d!.id}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted">
                      {isDone(d!.status) ? <Check className="size-3.5 text-emerald-600" /> : <Lock className="size-3.5 text-amber-600" />}
                      <span className="font-mono text-[10px] text-muted-foreground">{pad2(numbers.get(d!.id) ?? 0)}</span>
                      <span className="truncate">{d!.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {dependents.length > 0 && (
              <>
                <div className="pt-1 text-[11px] font-medium text-muted-foreground">Required by</div>
                <ul className="space-y-1">
                  {dependents.map((d) => (
                    <li key={d.id}>
                      <Link to={`/projects/${projectId}/prompts/${d.id}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted">
                        <span className="font-mono text-[10px] text-muted-foreground">{pad2(numbers.get(d.id) ?? 0)}</span>
                        <span className="truncate">{d.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <AttachmentsManager projectId={projectId} itemId={item.id} title="Prompt files" />
          </section>

          <section className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={!prev} onClick={() => prev && void guardNav(`/projects/${projectId}/prompts/${prev.id}`)} data-testid="editor-prev-prompt">
              <ArrowLeft className="size-3.5" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!nextP} onClick={() => nextP && void guardNav(`/projects/${projectId}/prompts/${nextP.id}`)} data-testid="editor-next-prompt">
              Next <ArrowRight className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => void withSaved(async () => { const id = await duplicateItem(item.id); toast.success("Prompt duplicated"); if (id) navigate(`/projects/${projectId}/prompts/${id}`); })} data-testid="editor-duplicate-button">
              <CopyPlus className="size-3.5" /> Duplicate
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => void remove()} data-testid="editor-delete-button">
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </section>
        </aside>
      </div>
    </>
  );
}
