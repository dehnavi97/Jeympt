import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { useProjectItems } from "@/lib/hooks";
import {
  createNote,
  createProject,
  createPrompt,
  updateItem,
  updateProject,
  type ProjectInput,
  type PromptInput,
} from "@/lib/ops";
import type { Project, SequenceItem } from "@/lib/types";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL } from "@/lib/types";
import { PROJECT_COLORS, PROJECT_ICONS } from "@/lib/projectStyle";
import {
  PromptFields,
  emptyPrompt,
  promptDirty,
  promptFromItem,
  validatePrompt,
} from "@/components/project/PromptFields";

/* ------------------------------------------------------------------ */
/* Global dialog controller — any page, the top bar or the command     */
/* palette can open the create/edit dialogs.                            */
/* ------------------------------------------------------------------ */

interface ItemDialogArgs {
  projectId: string;
  item?: SequenceItem;
  /** insertion index in the project sequence; null/undefined appends */
  index?: number | null;
}

interface DialogsCtx {
  openProject: (project?: Project) => void;
  openPrompt: (args: ItemDialogArgs) => void;
  openNote: (args: ItemDialogArgs) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
}

const Ctx = createContext<DialogsCtx | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useDialogs() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDialogs must be used inside DialogsProvider");
  return c;
}

export function DialogsProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<{ open: boolean; project?: Project }>({ open: false });
  const [prompt, setPrompt] = useState<ItemDialogArgs | null>(null);
  const [note, setNote] = useState<ItemDialogArgs | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const openProject = useCallback((p?: Project) => setProject({ open: true, project: p }), []);
  const value = useMemo(
    () => ({ openProject, openPrompt: setPrompt, openNote: setNote, searchOpen, setSearchOpen }),
    [openProject, searchOpen],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {project.open && (
        <ProjectDialog project={project.project} onClose={() => setProject({ open: false })} />
      )}
      {prompt && <PromptDialog args={prompt} onClose={() => setPrompt(null)} />}
      {note && <NoteDialog args={note} onClose={() => setNote(null)} />}
    </Ctx.Provider>
  );
}

/** Shared close-guard: asks before discarding unsaved edits. */
function useGuardedClose(dirty: boolean, onClose: () => void) {
  const confirm = useConfirm();
  const pending = useRef(false);
  return useCallback(async () => {
    if (pending.current) return; // a discard prompt is already showing
    if (dirty) {
      pending.current = true;
      const ok = await confirm({
        title: "Discard unsaved changes?",
        description: "Your edits in this form have not been saved.",
        confirmLabel: "Discard",
        force: true,
      });
      pending.current = false;
      if (!ok) return;
    }
    onClose();
  }, [dirty, confirm, onClose]);
}

/* ------------------------------ project ------------------------------ */

function ProjectDialog({ project, onClose }: { project?: Project; onClose: () => void }) {
  const navigate = useNavigate();
  const initial: ProjectInput = project
    ? {
        name: project.name,
        description: project.description,
        icon: project.icon,
        color: project.color,
        status: project.status,
      }
    : { name: "", description: "", icon: "folder", color: "indigo", status: "active" };
  const [v, setV] = useState<ProjectInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  const guardedClose = useGuardedClose(dirty, onClose);

  const save = async () => {
    const name = v.name.trim();
    if (!name) return setError("Project name is required.");
    if (name.length > 80) return setError("Keep the name under 80 characters.");
    setSaving(true);
    try {
      if (project) {
        await updateProject(project.id, { ...v, name, description: v.description.trim() });
        toast.success("Project updated");
        onClose();
      } else {
        const id = await createProject({ ...v, name, description: v.description.trim() });
        toast.success("Project created");
        onClose();
        navigate(`/projects/${id}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the project");
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && guardedClose()}>
      <DialogContent className="sm:max-w-lg" data-testid="project-dialog">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            A project holds an ordered sequence of prompts and notes.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={v.name}
              autoFocus
              onChange={(e) => {
                setV({ ...v, name: e.target.value });
                setError(null);
              }}
              placeholder="e.g. Checkout redesign with Jules"
              aria-invalid={!!error}
              data-testid="project-name-input"
            />
            {error && <p className="text-xs text-destructive" data-testid="project-name-error">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-description">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="project-description"
              value={v.description}
              onChange={(e) => setV({ ...v, description: e.target.value })}
              placeholder="What are you building or researching?"
              className="min-h-20"
              data-testid="project-description-input"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <div className="grid grid-cols-8 gap-1" data-testid="project-icon-picker">
                {Object.entries(PROJECT_ICONS).map(([key, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setV({ ...v, icon: key })}
                    data-testid={`project-icon-${key}`}
                    aria-label={key}
                    className={cn(
                      "grid aspect-square place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      v.icon === key && "border-brand bg-brand-subtle text-brand-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Accent color</Label>
                <div className="flex flex-wrap gap-1.5" data-testid="project-color-picker">
                  {Object.entries(PROJECT_COLORS).map(([key, c]) => (
                    <button
                      key={key}
                      type="button"
                      aria-label={c.label}
                      onClick={() => setV({ ...v, color: key })}
                      data-testid={`project-color-${key}`}
                      className={cn(
                        "grid size-6 place-items-center rounded-full ring-offset-2 ring-offset-background transition-shadow",
                        v.color === key && "ring-2",
                      )}
                      style={{ backgroundColor: c.hex, ["--tw-ring-color" as string]: c.hex }}
                    >
                      {v.color === key && <Check className="size-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={v.status} onValueChange={(s: string) => setV({ ...v, status: s as ProjectInput["status"] })}>
                  <SelectTrigger className="w-full" data-testid="project-status-select">
                    <SelectValue>{(s) => PROJECT_STATUS_LABEL[s as ProjectInput["status"]]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PROJECT_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => void guardedClose()} data-testid="project-dialog-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} data-testid="project-dialog-save">
              {project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ prompt ------------------------------ */

function PromptDialog({ args, onClose }: { args: ItemDialogArgs; onClose: () => void }) {
  const navigate = useNavigate();
  const items = useProjectItems(args.projectId) ?? [];
  const initial = useMemo(
    () => (args.item ? promptFromItem(args.item) : emptyPrompt()),
    [args.item],
  );
  const [v, setV] = useState<PromptInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = promptDirty(v, initial);
  const guardedClose = useGuardedClose(dirty, onClose);

  const save = async (openEditor = false) => {
    const e = validatePrompt(v);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      let id = args.item?.id;
      if (args.item) await updateItem(args.item.id, v);
      else id = await createPrompt(args.projectId, v, args.index ?? null);
      toast.success(args.item ? "Prompt saved" : "Prompt added");
      onClose();
      if (openEditor && id) navigate(`/projects/${args.projectId}/prompts/${id}`);
    } catch (err) {
      setErrors({ dependsOn: err instanceof Error ? err.message : "Could not save" });
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && guardedClose()}>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"
        data-testid="prompt-dialog"
      >
        <DialogHeader>
          <DialogTitle>{args.item ? "Edit prompt" : "New prompt"}</DialogTitle>
          <DialogDescription>
            Prompts are copied exactly as written — line breaks and formatting are preserved.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
          className="space-y-4"
        >
          <PromptFields
            value={v}
            onChange={setV}
            errors={errors}
            items={items}
            itemId={args.item?.id ?? null}
          />
          <DialogFooter className="items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void save(true)}
              disabled={saving}
              data-testid="prompt-dialog-save-open-editor"
            >
              <Maximize2 className="size-3.5" /> Save & open full editor
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => void guardedClose()} data-testid="prompt-dialog-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} data-testid="prompt-dialog-save">
                {args.item ? "Save prompt" : "Add prompt"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ note ------------------------------ */

function NoteDialog({ args, onClose }: { args: ItemDialogArgs; onClose: () => void }) {
  const initial = { title: args.item?.title ?? "", content: args.item?.content ?? "" };
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = v.title !== initial.title || v.content !== initial.content;
  const guardedClose = useGuardedClose(dirty, onClose);

  useEffect(() => setError(null), [v.title]);

  const save = async () => {
    if (!v.title.trim()) return setError("Give the note a short title.");
    setSaving(true);
    try {
      if (args.item) await updateItem(args.item.id, { title: v.title.trim(), content: v.content });
      else await createNote(args.projectId, { title: v.title.trim(), content: v.content }, args.index ?? null);
      toast.success(args.item ? "Note saved" : "Note added");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the note");
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && guardedClose()}>
      <DialogContent className="sm:max-w-lg" data-testid="note-dialog">
        <DialogHeader>
          <DialogTitle>{args.item ? "Edit note" : "New note"}</DialogTitle>
          <DialogDescription>
            Notes sit between prompts as reminders. They are never executed or copied as prompts.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              autoFocus
              value={v.title}
              onChange={(e) => setV({ ...v, title: e.target.value })}
              placeholder="e.g. Usage limit reached — continue tomorrow"
              aria-invalid={!!error}
              data-testid="note-title-input"
            />
            {error && <p className="text-xs text-destructive" data-testid="note-title-error">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-content">Content</Label>
            <Textarea
              id="note-content"
              value={v.content}
              onChange={(e) => setV({ ...v, content: e.target.value })}
              placeholder="Context, checklists or instructions for the next stage…"
              className="min-h-32"
              data-testid="note-content-input"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => void guardedClose()} data-testid="note-dialog-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} data-testid="note-dialog-save">
              {args.item ? "Save note" : "Add note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
