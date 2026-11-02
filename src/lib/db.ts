import Dexie, { type EntityTable } from "dexie";
import type { Activity, Attachment, Project, SequenceItem } from "./types";

// Local-first storage. Everything (including attachment Blobs) lives in IndexedDB,
// which persists across reloads and inside the Tauri 2 WebView.
export class JeymptDB extends Dexie {
  projects!: EntityTable<Project, "id">;
  items!: EntityTable<SequenceItem, "id">;
  attachments!: EntityTable<Attachment, "id">;
  activity!: EntityTable<Activity, "id">;

  constructor() {
    super("jeympt");
    this.version(1).stores({
      projects: "id, status, favorite, updatedAt, lastAccessedAt, createdAt",
      items: "id, projectId, [projectId+order], type, status, favorite, updatedAt",
      attachments: "id, projectId, itemId, createdAt",
      activity: "id, projectId, createdAt",
    });
  }
}

export const db = new JeymptDB();

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Ask the browser/WebView to keep our data even under storage pressure.
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    /* not supported — data is still stored, just "best effort" */
  }
}
