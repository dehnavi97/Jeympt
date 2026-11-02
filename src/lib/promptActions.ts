import { toast } from "sonner";
import { db } from "./db";
import { copyText } from "./clipboard";
import { markPromptSent } from "./ops";
import type { SequenceItem } from "./types";
import { indexItems, nextActionable, promptState } from "./workflow";

export const HIGHLIGHT_EVENT = "jeympt:highlight";

export async function copyOnly(item: SequenceItem) {
  const ok = await copyText(item.content);
  if (ok) toast.success("Copied to clipboard", { description: item.title });
  else toast.error("Clipboard access failed", { description: "Nothing was copied. Try again or copy manually." });
  return ok;
}

/**
 * Copy & Mark as Sent. The status only changes after the clipboard write is confirmed.
 * "Sent" is a user-confirmed marker — Jeympt never submits anything to an AI service.
 */
export async function copyAndMarkSent(item: SequenceItem): Promise<boolean> {
  const siblings = await db.items.where("projectId").equals(item.projectId).toArray();
  const state = promptState(item, indexItems(siblings));
  if (state.blocked) {
    toast.error("This prompt is blocked", {
      description: state.blockedReason ?? "Complete its prerequisites first.",
    });
    return false;
  }
  const ok = await copyText(item.content);
  if (!ok) {
    toast.error("Clipboard access failed", {
      description: "The prompt was NOT marked as sent. Try again.",
    });
    return false;
  }
  await markPromptSent(item.id);
  const after = await db.items.where("projectId").equals(item.projectId).toArray();
  const next = nextActionable(after);
  toast.success("Copied & marked as sent", {
    description: next ? `Next up: ${next.title}` : "All prompts in this project are done.",
  });
  window.dispatchEvent(new CustomEvent(HIGHLIGHT_EVENT, { detail: next?.id ?? null }));
  return true;
}
