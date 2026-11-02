import type { PromptStatus, SequenceItem } from "./types";

// A prompt counts as "done" (satisfies dependents, counts toward progress) once it is Sent or Completed.
export const DONE_STATUSES: PromptStatus[] = ["sent", "completed"];
export const isDone = (s: PromptStatus) => DONE_STATUSES.includes(s);

export interface PromptState {
  /** prerequisite prompts that are not done yet */
  unmetDeps: SequenceItem[];
  /** blocked either by unmet dependencies or a manual Blocked status */
  blocked: boolean;
  blockedReason: string | null;
  done: boolean;
  /** can be sent right now */
  actionable: boolean;
}

export function promptState(item: SequenceItem, byId: Map<string, SequenceItem>): PromptState {
  const done = isDone(item.status);
  const unmetDeps = item.dependsOn
    .map((id) => byId.get(id))
    .filter((d): d is SequenceItem => !!d && d.type === "prompt" && !isDone(d.status));
  const depBlocked = !done && unmetDeps.length > 0;
  const manualBlocked = !done && item.status === "blocked";
  let blockedReason: string | null = null;
  if (depBlocked) blockedReason = `Waiting for: ${unmetDeps.map((d) => d.title).join(", ")}`;
  else if (manualBlocked) blockedReason = "Manually marked as blocked";
  return {
    unmetDeps,
    blocked: depBlocked || manualBlocked,
    blockedReason,
    done,
    actionable: !done && !depBlocked && !manualBlocked,
  };
}

export function indexItems(items: SequenceItem[]) {
  return new Map(items.map((i) => [i.id, i]));
}

/** First prompt in sequence order that can be executed now. */
export function nextActionable(items: SequenceItem[]): SequenceItem | null {
  const byId = indexItems(items);
  const sorted = [...items].sort((a, b) => a.order - b.order);
  return sorted.find((i) => i.type === "prompt" && promptState(i, byId).actionable) ?? null;
}

export interface Progress {
  total: number;
  done: number;
  sent: number;
  completed: number;
  pending: number;
  blocked: number;
  percent: number;
}

export function progressOf(items: SequenceItem[]): Progress {
  const prompts = items.filter((i) => i.type === "prompt");
  const byId = indexItems(items);
  const sent = prompts.filter((p) => p.status === "sent").length;
  const completed = prompts.filter((p) => p.status === "completed").length;
  const done = sent + completed;
  const blocked = prompts.filter((p) => promptState(p, byId).blocked).length;
  return {
    total: prompts.length,
    done,
    sent,
    completed,
    pending: prompts.length - done,
    blocked,
    percent: prompts.length ? Math.round((done / prompts.length) * 100) : 0,
  };
}

export function progressByProject(items: SequenceItem[]): Map<string, Progress> {
  const groups = new Map<string, SequenceItem[]>();
  for (const i of items) {
    const g = groups.get(i.projectId);
    if (g) g.push(i);
    else groups.set(i.projectId, [i]);
  }
  return new Map([...groups].map(([k, v]) => [k, progressOf(v)]));
}

export const EMPTY_PROGRESS: Progress = { total: 0, done: 0, sent: 0, completed: 0, pending: 0, blocked: 0, percent: 0 };

/** Does `fromId` (transitively) depend on `targetId`? */
export function dependsTransitively(
  fromId: string,
  targetId: string,
  byId: Map<string, SequenceItem>,
): boolean {
  const seen = new Set<string>();
  const stack = [fromId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === targetId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const node = byId.get(cur);
    if (node) stack.push(...node.dependsOn);
  }
  return false;
}

/**
 * Prompts that `itemId` may depend on without creating a cycle.
 * For a new prompt (itemId null) every prompt in the project is allowed.
 */
export function allowedDependencies(itemId: string | null, items: SequenceItem[]): SequenceItem[] {
  const byId = indexItems(items);
  return items
    .filter((i) => i.type === "prompt" && i.id !== itemId)
    .filter((c) => !itemId || !dependsTransitively(c.id, itemId, byId))
    .sort((a, b) => a.order - b.order);
}

export function validateDependencies(
  itemId: string | null,
  deps: string[],
  items: SequenceItem[],
): string | null {
  const allowed = new Set(allowedDependencies(itemId, items).map((i) => i.id));
  for (const d of deps) {
    if (d === itemId) return "A prompt cannot depend on itself.";
    if (!allowed.has(d)) return "This dependency would create a circular chain.";
  }
  return null;
}

/** "Step 03" style numbering — prompts only, notes are not numbered. */
export function promptNumbers(items: SequenceItem[]): Map<string, number> {
  const map = new Map<string, number>();
  let n = 0;
  for (const i of [...items].sort((a, b) => a.order - b.order)) {
    if (i.type === "prompt") map.set(i.id, ++n);
  }
  return map;
}
