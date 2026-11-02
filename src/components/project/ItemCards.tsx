import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  CopyPlus,
  GripVertical,
  Link2,
  Lock,
  Maximize2,
  MoreHorizontal,
  Paperclip,
  Pencil,
  RotateCcw,
  Send,
  Star,
  StickyNote,
  Trash2,
} from "lucide-react";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PromptStatusBadge, Tip } from "@/components/common/ui";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { useDialogs } from "@/components/dialogs/DialogsProvider";
import { copyAndMarkSent, copyOnly } from "@/lib/promptActions";
import { deleteItem, duplicateItem, setPromptStatus, toggleItemFavorite } from "@/lib/ops";
import { fullDate, pad2, timeAgo } from "@/lib/format";
import type { PromptState } from "@/lib/workflow";
import type { SequenceItem } from "@/lib/types";
import { PROMPT_STATUSES, PROMPT_STATUS_LABEL } from "@/lib/types";

export interface DragHandle {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  disabled: boolean;
}

function Handle({ drag }: { drag?: DragHandle }) {
  if (!drag || drag.disabled) return <span className="w-4" />;
  return (
    <button
      type="button"
      className="-ml-1 grid h-6 w-5 cursor-grab touch-none place-items-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
      aria-label="Drag to reorder"
      data-testid="item-drag-handle"
      {...drag.attributes}
      {...drag.listeners}
    >
      <GripVertical className="size-3.5" />
    </button>
  );
}

export function StatusMenu({ item }: { item: SequenceItem }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className="rounded-md transition-opacity hover:opacity-80" data-testid={`prompt-status-trigger-${item.id}`} aria-label="Change status" />
        }
      >
        <PromptStatusBadge status={item.status} testId={`prompt-status-${item.id}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel className="text-[11px]">Set status</DropdownMenuLabel>
        {PROMPT_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => void setPromptStatus(item.id, s).then(() => toast.success(`Status set to ${PROMPT_STATUS_LABEL[s]}`))}
            data-testid={`prompt-set-status-${item.id}-${s}`}
          >
            <PromptStatusBadge status={s} />
            {item.status === s && <Check className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PromptItemCard({
  item,
  number,
  state,
  isNext,
  flash,
  collapsed,
  onToggle,
  depInfo,
  attachmentCount,
  drag,
}: {
  item: SequenceItem;
  number: number;
  state: PromptState;
  isNext: boolean;
  flash: boolean;
  collapsed: boolean;
  onToggle: () => void;
  depInfo: { id: string; title: string; number: number; done: boolean }[];
  attachmentCount: number;
  drag?: DragHandle;
}) {
  const { openPrompt } = useDialogs();
  const confirm = useConfirm();
  const [expandedContent, setExpandedContent] = useState(false);
  const editorUrl = `/projects/${item.projectId}/prompts/${item.id}`;
  const long = item.content.split("\n").length > 10 || item.content.length > 700;

  const remove = async () => {
    if (!(await confirm({ title: `Delete prompt “${item.title}”?`, description: "Its attachments are removed too, and other prompts will no longer depend on it." })))
      return;
    await deleteItem(item.id);
    toast.success("Prompt deleted");
  };

  return (
    <article
      id={`item-${item.id}`}
      data-testid={`prompt-card-${item.id}`}
      data-next={isNext || undefined}
      data-blocked={state.blocked || undefined}
      className={cn(
        "group/card relative rounded-xl border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] transition-[box-shadow,border-color,background-color] duration-200",
        "hover:shadow-[0_8px_20px_-6px_rgba(15,23,42,0.10)]",
        isNext && "border-brand/70 ring-2 ring-brand/25 shadow-[0_0_18px_-4px_rgba(99,102,241,0.35)]",
        state.blocked && "border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/15",
        state.done && "bg-card/70",
        flash && "animate-flash",
      )}
    >
      {/* header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Handle drag={drag} />
        <span
          className={cn(
            "grid h-6 min-w-7 place-items-center rounded-md border px-1 font-mono text-[11px] font-semibold",
            state.done ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300" : isNext ? "border-brand/50 bg-brand-subtle text-brand-foreground" : "bg-muted text-muted-foreground",
          )}
          data-testid={`prompt-number-${item.id}`}
        >
          {state.done ? <Check className="size-3.5" /> : pad2(number)}
        </span>
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left" data-testid={`prompt-toggle-${item.id}`}>
          <span className={cn("block truncate text-sm font-medium", state.done && "text-muted-foreground")} data-testid={`prompt-title-${item.id}`}>
            {item.title}
          </span>
          {collapsed && item.description && (
            <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
          )}
        </button>
        {isNext && (
          <span className="hidden h-5 items-center rounded-md bg-brand px-1.5 text-[10px] font-semibold tracking-wide text-white uppercase sm:inline-flex" data-testid={`prompt-next-badge-${item.id}`}>
            Next up
          </span>
        )}
        {state.blocked && state.unmetDeps.length > 0 ? (
          <Tip label={state.blockedReason}>
            <span data-testid={`prompt-blocked-badge-${item.id}`}>
              <PromptStatusBadge status={item.status} waiting />
            </span>
          </Tip>
        ) : (
          <StatusMenu item={item} />
        )}
        <div className="flex items-center">
          {attachmentCount > 0 && (
            <span className="mr-1 hidden items-center gap-0.5 text-[11px] text-muted-foreground sm:flex" data-testid={`prompt-attachment-count-${item.id}`}>
              <Paperclip className="size-3" />
              {attachmentCount}
            </span>
          )}
          <Tip label={item.favorite ? "Remove from favorites" : "Add to favorites"}>
            <Button variant="ghost" size="icon-xs" onClick={() => void toggleItemFavorite(item.id)} aria-label="Toggle favorite" data-testid={`prompt-favorite-${item.id}`}>
              <Star className={cn("size-3.5", item.favorite && "fill-amber-400 text-amber-400")} />
            </Button>
          </Tip>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="More actions" data-testid={`prompt-menu-${item.id}`} />}>
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openPrompt({ projectId: item.projectId, item })} data-testid={`prompt-edit-${item.id}`}>
                <Pencil className="size-4" /> Quick edit
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to={editorUrl} />} data-testid={`prompt-open-editor-${item.id}`}>
                <Maximize2 className="size-4" /> Open editor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void duplicateItem(item.id).then(() => toast.success("Prompt duplicated"))} data-testid={`prompt-duplicate-${item.id}`}>
                <CopyPlus className="size-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {item.status !== "completed" && (
                <DropdownMenuItem onClick={() => void setPromptStatus(item.id, "completed")} data-testid={`prompt-mark-completed-${item.id}`}>
                  <CheckCheck className="size-4" /> Mark completed
                </DropdownMenuItem>
              )}
              {item.status !== "pending" && (
                <DropdownMenuItem onClick={() => void setPromptStatus(item.id, "pending")} data-testid={`prompt-reset-${item.id}`}>
                  <RotateCcw className="size-4" /> Reset to pending
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => void remove()} data-testid={`prompt-delete-${item.id}`}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon-xs" onClick={onToggle} aria-label={collapsed ? "Expand" : "Collapse"} data-testid={`prompt-collapse-${item.id}`}>
            <ChevronDown className={cn("size-3.5 transition-transform duration-200", collapsed && "-rotate-90")} />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-3 border-t px-3 pt-3 pb-3 sm:pl-[68px]">
          {item.description && <p className="text-[13px] text-muted-foreground">{item.description}</p>}

          {state.blocked && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200" data-testid={`prompt-blocked-reason-${item.id}`}>
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              <span>{state.blockedReason}</span>
            </div>
          )}

          <div className="relative">
            <pre
              className={cn(
                "overflow-hidden rounded-lg border bg-muted/40 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-foreground/90",
                long && !expandedContent && "max-h-52",
              )}
              data-testid={`prompt-content-${item.id}`}
            >
              {item.content}
            </pre>
            {long && (
              <div className={cn("flex justify-center", !expandedContent && "absolute inset-x-0 bottom-0 rounded-b-lg bg-gradient-to-t from-card via-card/80 to-transparent pt-8 pb-1.5")}>
                <button type="button" onClick={() => setExpandedContent((v) => !v)} className="text-[11px] font-medium text-brand-foreground hover:underline" data-testid={`prompt-show-more-${item.id}`}>
                  {expandedContent ? "Show less" : "Show full prompt"}
                </button>
              </div>
            )}
          </div>

          {depInfo.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" data-testid={`prompt-deps-${item.id}`}>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Link2 className="size-3" /> Depends on
              </span>
              {depInfo.map((d) => (
                <a
                  key={d.id}
                  href={`#item-${d.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`item-${d.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className={cn(
                    "inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[11px] transition-colors hover:bg-muted",
                    d.done ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300",
                  )}
                  data-testid={`prompt-dep-chip-${item.id}-${d.id}`}
                >
                  {d.done ? <Check className="size-3" /> : <Lock className="size-3" />}
                  <span className="font-mono">{pad2(d.number)}</span>
                  <span className="max-w-40 truncate">{d.title}</span>
                </a>
              ))}
            </div>
          )}

          {item.internalNote && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground" data-testid={`prompt-internal-note-${item.id}`}>
              <StickyNote className="mt-0.5 size-3.5 shrink-0" />
              <span className="whitespace-pre-wrap">{item.internalNote}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {!state.done ? (
              <Tip label={state.blocked ? state.blockedReason : "Copies the prompt, then marks it as sent (you paste it yourself)"}>
                <span>
                  <Button
                    size="sm"
                    disabled={state.blocked}
                    onClick={() => void copyAndMarkSent(item)}
                    className={cn("gap-1.5", isNext && "animate-next-pulse")}
                    data-testid={`prompt-copy-send-${item.id}`}
                  >
                    {state.blocked ? <Lock className="size-3.5" /> : <Send className="size-3.5" />}
                    Copy & Mark as Sent
                  </Button>
                </span>
              </Tip>
            ) : (
              item.status === "sent" && (
                <Button size="sm" variant="outline" onClick={() => void setPromptStatus(item.id, "completed")} className="gap-1.5" data-testid={`prompt-complete-${item.id}`}>
                  <CheckCheck className="size-3.5" /> Mark completed
                </Button>
              )
            )}
            <Button size="sm" variant="outline" onClick={() => void copyOnly(item)} className="gap-1.5" data-testid={`prompt-copy-only-${item.id}`}>
              <Copy className="size-3.5" /> Copy only
            </Button>
            <Link to={editorUrl} className="text-xs text-muted-foreground transition-colors hover:text-foreground" data-testid={`prompt-editor-link-${item.id}`}>
              Open editor
            </Link>
            <span className="ml-auto text-[11px] text-muted-foreground" data-testid={`prompt-meta-${item.id}`}>
              {item.sentAt ? (
                <Tip label={fullDate(item.sentAt)}>
                  <span>Sent {timeAgo(item.sentAt)}</span>
                </Tip>
              ) : (
                <>Updated {timeAgo(item.updatedAt)}</>
              )}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

export function NoteItemCard({
  item,
  collapsed,
  onToggle,
  flash,
  drag,
}: {
  item: SequenceItem;
  collapsed: boolean;
  onToggle: () => void;
  flash: boolean;
  drag?: DragHandle;
}) {
  const { openNote } = useDialogs();
  const confirm = useConfirm();
  const remove = async () => {
    if (!(await confirm({ title: `Delete note “${item.title}”?` }))) return;
    await deleteItem(item.id);
    toast.success("Note deleted");
  };
  return (
    <article
      id={`item-${item.id}`}
      data-testid={`note-card-${item.id}`}
      className={cn(
        "relative rounded-xl border border-dashed border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40",
        flash && "animate-flash",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Handle drag={drag} />
        <span className="inline-flex h-5 items-center gap-1 rounded-md bg-slate-200/80 px-1.5 text-[10px] font-semibold tracking-wider text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-300">
          <StickyNote className="size-3" /> Note
        </span>
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-slate-700 dark:text-slate-200" data-testid={`note-title-${item.id}`}>
          {item.title}
        </button>
        <Button variant="ghost" size="icon-xs" onClick={() => openNote({ projectId: item.projectId, item })} aria-label="Edit note" data-testid={`note-edit-${item.id}`}>
          <Pencil className="size-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="More actions" data-testid={`note-menu-${item.id}`} />}>
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => void duplicateItem(item.id).then(() => toast.success("Note duplicated"))} data-testid={`note-duplicate-${item.id}`}>
              <CopyPlus className="size-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => void remove()} data-testid={`note-delete-${item.id}`}>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {item.content && (
          <Button variant="ghost" size="icon-xs" onClick={onToggle} aria-label={collapsed ? "Expand" : "Collapse"} data-testid={`note-collapse-${item.id}`}>
            <ChevronDown className={cn("size-3.5 transition-transform duration-200", collapsed && "-rotate-90")} />
          </Button>
        )}
      </div>
      {!collapsed && item.content && (
        <p className="px-3 pb-3 text-[13px] leading-relaxed whitespace-pre-wrap text-slate-600 sm:pl-[68px] dark:text-slate-300" data-testid={`note-content-${item.id}`}>
          {item.content}
        </p>
      )}
    </article>
  );
}
