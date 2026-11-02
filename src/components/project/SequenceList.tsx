import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, Plus, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { reorderItems } from "@/lib/ops";
import { HIGHLIGHT_EVENT } from "@/lib/promptActions";
import { indexItems, isDone, nextActionable, promptNumbers, promptState } from "@/lib/workflow";
import type { SequenceItem } from "@/lib/types";
import { useDialogs } from "@/components/dialogs/DialogsProvider";
import { NoteItemCard, PromptItemCard, type DragHandle } from "./ItemCards";

function InsertGap({ projectId, index }: { projectId: string; index: number }) {
  const { openPrompt, openNote } = useDialogs();
  return (
    <div className="group/gap relative flex h-3 items-center justify-center" data-testid={`insert-gap-${index}`}>
      <div className="absolute inset-x-6 top-1/2 h-px bg-brand/40 opacity-0 transition-opacity group-hover/gap:opacity-100" />
      <div className="relative z-[1] flex gap-1 opacity-0 transition-opacity group-hover/gap:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={() => openPrompt({ projectId, index })}
          className="inline-flex h-5 items-center gap-1 rounded-full border bg-card px-2 text-[10px] font-medium text-muted-foreground shadow-sm transition-colors hover:border-brand/50 hover:text-brand-foreground"
          data-testid={`insert-prompt-at-${index}`}
        >
          <Plus className="size-3" /> <FileText className="size-3" /> Prompt
        </button>
        <button
          type="button"
          onClick={() => openNote({ projectId, index })}
          className="inline-flex h-5 items-center gap-1 rounded-full border bg-card px-2 text-[10px] font-medium text-muted-foreground shadow-sm transition-colors hover:border-brand/50 hover:text-brand-foreground"
          data-testid={`insert-note-at-${index}`}
        >
          <Plus className="size-3" /> <StickyNote className="size-3" /> Note
        </button>
      </div>
    </div>
  );
}

function Sortable({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (drag: DragHandle) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-20 opacity-90 [&>article]:shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)]")}
    >
      {children({ attributes, listeners, disabled })}
    </div>
  );
}

const collapseKey = (projectId: string) => `jeympt.collapsed.${projectId}`;

export default function SequenceList({
  projectId,
  items,
  visibleIds,
  focusId,
  collapseAll,
}: {
  projectId: string;
  items: SequenceItem[];
  /** null = no filter active (drag & insert enabled) */
  visibleIds: Set<string> | null;
  focusId: string | null;
  collapseAll: { value: boolean; nonce: number } | null;
}) {
  const [order, setOrder] = useState<string[]>(() => items.map((i) => i.id));
  const [flashId, setFlashId] = useState<string | null>(focusId);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(collapseKey(projectId)) ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  });

  // keep local order in sync with the database (live query)
  useEffect(() => setOrder(items.map((i) => i.id)), [items]);

  useEffect(() => {
    localStorage.setItem(collapseKey(projectId), JSON.stringify([...collapsed]));
  }, [collapsed, projectId]);

  useEffect(() => {
    if (!collapseAll) return;
    setCollapsed(collapseAll.value ? new Set(items.map((i) => i.id)) : new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseAll?.nonce]);

  // highlight + scroll to the next prompt after "Copy & Mark as Sent", or to a ?focus= target
  useEffect(() => {
    const focus = (id: string | null) => {
      if (!id) return;
      setFlashId(id);
      setCollapsed((c) => {
        const n = new Set(c);
        n.delete(id);
        return n;
      });
      setTimeout(() => document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
      setTimeout(() => setFlashId((f) => (f === id ? null : f)), 1800);
    };
    focus(focusId);
    const onHi = (e: Event) => focus((e as CustomEvent<string | null>).detail);
    window.addEventListener(HIGHLIGHT_EVENT, onHi);
    return () => window.removeEventListener(HIGHLIGHT_EVENT, onHi);
  }, [focusId]);

  const attachmentCounts = useLiveQuery(async () => {
    const atts = await db.attachments.where("projectId").equals(projectId).toArray();
    const m = new Map<string, number>();
    for (const a of atts) if (a.itemId) m.set(a.itemId, (m.get(a.itemId) ?? 0) + 1);
    return m;
  }, [projectId]);

  const byId = useMemo(() => indexItems(items), [items]);
  const numbers = useMemo(() => promptNumbers(items), [items]);
  const next = useMemo(() => nextActionable(items), [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    const nextOrder = arrayMove(order, from, to);
    setOrder(nextOrder);
    reorderItems(projectId, nextOrder).catch(() => {
      toast.error("Could not save the new order");
      setOrder(items.map((i) => i.id));
    });
  };

  const toggle = (id: string) =>
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const filtering = visibleIds !== null;
  const ordered = order.map((id) => byId.get(id)).filter((i): i is SequenceItem => !!i);
  const shown = filtering ? ordered.filter((i) => visibleIds.has(i.id)) : ordered;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={shown.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div data-testid="sequence-list">
          {!filtering && <InsertGap projectId={projectId} index={0} />}
          {shown.map((item, idx) => (
            <div key={item.id}>
              <Sortable id={item.id} disabled={filtering}>
                {(drag) =>
                  item.type === "prompt" ? (
                    <PromptItemCard
                      item={item}
                      number={numbers.get(item.id) ?? 0}
                      state={promptState(item, byId)}
                      isNext={next?.id === item.id}
                      flash={flashId === item.id}
                      collapsed={collapsed.has(item.id)}
                      onToggle={() => toggle(item.id)}
                      depInfo={item.dependsOn
                        .map((d) => byId.get(d))
                        .filter((d): d is SequenceItem => !!d)
                        .map((d) => ({ id: d.id, title: d.title, number: numbers.get(d.id) ?? 0, done: isDone(d.status) }))}
                      attachmentCount={attachmentCounts?.get(item.id) ?? 0}
                      drag={drag}
                    />
                  ) : (
                    <NoteItemCard
                      item={item}
                      collapsed={collapsed.has(item.id)}
                      onToggle={() => toggle(item.id)}
                      flash={flashId === item.id}
                      drag={drag}
                    />
                  )
                }
              </Sortable>
              {filtering ? <div className="h-2" /> : <InsertGap projectId={projectId} index={idx + 1} />}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
