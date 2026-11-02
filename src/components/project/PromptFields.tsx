import { useMemo, useState } from "react";
import { Check, Link2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { allowedDependencies, promptNumbers } from "@/lib/workflow";
import type { PromptInput } from "@/lib/ops";
import type { SequenceItem } from "@/lib/types";
import { PROMPT_STATUSES, PROMPT_STATUS_LABEL } from "@/lib/types";
import { PromptStatusBadge } from "@/components/common/ui";
import { pad2 } from "@/lib/format";

export const emptyPrompt = (): PromptInput => ({
  title: "",
  content: "",
  description: "",
  internalNote: "",
  status: "pending",
  dependsOn: [],
});

export const promptFromItem = (i: SequenceItem): PromptInput => ({
  title: i.title,
  content: i.content,
  description: i.description,
  internalNote: i.internalNote,
  status: i.status,
  dependsOn: [...i.dependsOn],
});

export function validatePrompt(v: PromptInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.title.trim()) e.title = "Title is required.";
  else if (v.title.length > 160) e.title = "Keep the title under 160 characters.";
  if (!v.content.trim()) e.content = "Prompt content cannot be empty.";
  return e;
}

export const promptDirty = (a: PromptInput, b: PromptInput) =>
  JSON.stringify(a) !== JSON.stringify(b);

export function DependencySelector({
  itemId,
  items,
  value,
  onChange,
}: {
  itemId: string | null;
  items: SequenceItem[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const allowed = useMemo(() => allowedDependencies(itemId, items), [itemId, items]);
  const numbers = useMemo(() => promptNumbers(items), [items]);
  const allowedIds = new Set(allowed.map((a) => a.id));
  const excluded = items.filter(
    (i) => i.type === "prompt" && i.id !== itemId && !allowedIds.has(i.id),
  );
  const shown = allowed.filter((a) => a.title.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  if (allowed.length === 0 && excluded.length === 0)
    return (
      <p className="rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">
        No other prompts in this project yet. Add more prompts to define prerequisites.
      </p>
    );

  return (
    <div className="rounded-lg border bg-background" data-testid="dependency-selector">
      {allowed.length > 5 && (
        <div className="flex items-center gap-2 border-b px-2.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter prompts…"
            className="h-8 w-full bg-transparent text-xs outline-none"
            data-testid="dependency-filter-input"
          />
        </div>
      )}
      <ul className="max-h-48 overflow-y-auto p-1">
        {shown.map((p) => {
          const on = value.includes(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                data-testid={`dependency-option-${p.id}`}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                  on && "bg-brand-subtle",
                )}
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                    on ? "border-brand bg-brand text-white" : "border-input",
                  )}
                >
                  {on && <Check className="size-3" />}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {pad2(numbers.get(p.id) ?? 0)}
                </span>
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                <PromptStatusBadge status={p.status} />
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-2 py-2 text-xs text-muted-foreground">No matches.</li>}
      </ul>
      {excluded.length > 0 && (
        <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">
          {excluded.length} prompt{excluded.length > 1 ? "s" : ""} hidden — they already depend on this
          one, so selecting them would create a circular chain.
        </p>
      )}
    </div>
  );
}

export function PromptFields({
  value,
  onChange,
  errors,
  items,
  itemId,
  tall,
}: {
  value: PromptInput;
  onChange: (v: PromptInput) => void;
  errors: Record<string, string>;
  items: SequenceItem[];
  itemId: string | null;
  tall?: boolean;
}) {
  const set = <K extends keyof PromptInput>(k: K, v: PromptInput[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="prompt-title">Title</Label>
          <Input
            id="prompt-title"
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Generate database schema"
            aria-invalid={!!errors.title}
            data-testid="prompt-title-input"
            autoFocus
          />
          {errors.title && <p className="text-xs text-destructive" data-testid="prompt-title-error">{errors.title}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={value.status} onValueChange={(v: string) => set("status", v as PromptInput["status"])}>
            <SelectTrigger className="w-full" data-testid="prompt-status-select">
              <SelectValue>{(v) => PROMPT_STATUS_LABEL[v as PromptInput["status"]]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PROMPT_STATUSES.map((s) => (
                <SelectItem key={s} value={s} data-testid={`prompt-status-option-${s}`}>
                  {PROMPT_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prompt-description">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="prompt-description"
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What this step is for"
          data-testid="prompt-description-input"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="prompt-content">Prompt content</Label>
          <span className="font-mono text-[10px] text-muted-foreground" data-testid="prompt-char-count">
            {value.content.length.toLocaleString()} chars · {value.content ? value.content.split("\n").length : 0} lines
          </span>
        </div>
        <Textarea
          id="prompt-content"
          value={value.content}
          onChange={(e) => set("content", e.target.value)}
          placeholder={"Write the full prompt here.\nMarkdown, multiline instructions and code blocks are preserved exactly when copied."}
          spellCheck={false}
          aria-invalid={!!errors.content}
          data-testid="prompt-content-input"
          className={cn(
            "resize-y font-mono text-[13px] leading-relaxed [tab-size:2]",
            tall ? "min-h-[420px]" : "min-h-[220px]",
          )}
          onKeyDown={(e) => {
            if (e.key === "Tab" && !e.shiftKey) {
              e.preventDefault();
              const t = e.currentTarget;
              const { selectionStart: s, selectionEnd: en } = t;
              const next = `${value.content.slice(0, s)}  ${value.content.slice(en)}`;
              set("content", next);
              requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2));
            }
          }}
        />
        {errors.content && <p className="text-xs text-destructive" data-testid="prompt-content-error">{errors.content}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Link2 className="size-3.5" /> Prerequisites
          <span className="font-normal text-muted-foreground">— must be Sent or Completed first</span>
        </Label>
        <DependencySelector
          itemId={itemId}
          items={items}
          value={value.dependsOn}
          onChange={(v) => set("dependsOn", v)}
        />
        {errors.dependsOn && <p className="text-xs text-destructive">{errors.dependsOn}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prompt-internal-note">
          Internal note <span className="font-normal text-muted-foreground">(never copied)</span>
        </Label>
        <Textarea
          id="prompt-internal-note"
          value={value.internalNote}
          onChange={(e) => set("internalNote", e.target.value)}
          placeholder="Reminders for yourself, e.g. “Use Claude for this one”"
          className="min-h-16"
          data-testid="prompt-internal-note-input"
        />
      </div>
    </div>
  );
}
