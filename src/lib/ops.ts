import { db, uid } from "./db";
import type {
  ActivityKind,
  Attachment,
  Project,
  ProjectStatus,
  PromptStatus,
  SequenceItem,
} from "./types";
import { PROMPT_STATUS_LABEL } from "./types";
import { validateDependencies } from "./workflow";

const now = () => Date.now();

async function log(
  kind: ActivityKind,
  message: string,
  projectId: string | null = null,
  itemId: string | null = null,
) {
  await db.activity.add({ id: uid(), kind, message, projectId, itemId, createdAt: now() });
}

async function touchProject(projectId: string) {
  await db.projects.update(projectId, { updatedAt: now() });
}

/* ------------------------------ projects ------------------------------ */

export type ProjectInput = Pick<Project, "name" | "description" | "icon" | "color" | "status">;

export async function createProject(input: ProjectInput): Promise<string> {
  const id = uid();
  const t = now();
  await db.transaction("rw", db.projects, db.activity, async () => {
    await db.projects.add({
      ...input,
      id,
      favorite: false,
      createdAt: t,
      updatedAt: t,
      lastAccessedAt: null,
    });
    await log("project_created", `Created project “${input.name}”`, id);
  });
  return id;
}

export async function updateProject(id: string, patch: Partial<ProjectInput>) {
  await db.transaction("rw", db.projects, db.activity, async () => {
    await db.projects.update(id, { ...patch, updatedAt: now() });
    const p = await db.projects.get(id);
    await log("project_updated", `Updated project “${p?.name ?? ""}”`, id);
  });
}

export async function setProjectStatus(id: string, status: ProjectStatus) {
  await db.transaction("rw", db.projects, db.activity, async () => {
    const p = await db.projects.get(id);
    if (!p) return;
    await db.projects.update(id, { status, updatedAt: now() });
    const kind: ActivityKind =
      status === "archived"
        ? "project_archived"
        : p.status === "archived"
          ? "project_restored"
          : "project_updated";
    const verb =
      status === "archived" ? "Archived" : p.status === "archived" ? "Restored" : "Updated status of";
    await log(kind, `${verb} project “${p.name}”`, id);
  });
}

export async function toggleProjectFavorite(id: string) {
  const p = await db.projects.get(id);
  if (p) await db.projects.update(id, { favorite: !p.favorite });
}

export async function markProjectAccessed(id: string) {
  await db.projects.update(id, { lastAccessedAt: now() });
}

export async function deleteProject(id: string) {
  await db.transaction("rw", [db.projects, db.items, db.attachments, db.activity], async () => {
    const p = await db.projects.get(id);
    await db.items.where("projectId").equals(id).delete();
    await db.attachments.where("projectId").equals(id).delete();
    await db.activity.where("projectId").equals(id).delete();
    await db.projects.delete(id);
    if (p) await log("project_deleted", `Deleted project “${p.name}”`);
  });
}

export async function duplicateProject(id: string): Promise<string | null> {
  return db.transaction("rw", [db.projects, db.items, db.attachments, db.activity], async () => {
    const p = await db.projects.get(id);
    if (!p) return null;
    const newId = uid();
    const t = now();
    await db.projects.add({
      ...p,
      id: newId,
      name: `${p.name} (Copy)`,
      favorite: false,
      status: p.status === "archived" ? "active" : p.status,
      createdAt: t,
      updatedAt: t,
      lastAccessedAt: null,
    });
    const items = await db.items.where("projectId").equals(id).toArray();
    const idMap = new Map(items.map((i) => [i.id, uid()]));
    await db.items.bulkAdd(
      items.map((i) => ({
        ...i,
        id: idMap.get(i.id)!,
        projectId: newId,
        dependsOn: i.dependsOn.map((d) => idMap.get(d)).filter((d): d is string => !!d),
        createdAt: t,
        updatedAt: t,
      })),
    );
    const atts = await db.attachments.where("projectId").equals(id).toArray();
    await db.attachments.bulkAdd(
      atts.map((a) => ({
        ...a,
        id: uid(),
        projectId: newId,
        itemId: a.itemId ? (idMap.get(a.itemId) ?? null) : null,
      })),
    );
    await log("project_duplicated", `Duplicated “${p.name}”`, newId);
    return newId;
  });
}

/* ------------------------------ sequence items ------------------------------ */

export type PromptInput = Pick<
  SequenceItem,
  "title" | "content" | "description" | "internalNote" | "status" | "dependsOn"
>;
export type NoteInput = Pick<SequenceItem, "title" | "content">;

/** Insert a new item at position `index` (0-based among the project's ordered items); appends when null. */
async function insertItem(projectId: string, item: SequenceItem, index: number | null) {
  const existing = await db.items.where("projectId").equals(projectId).sortBy("order");
  const pos = index === null || index > existing.length ? existing.length : Math.max(0, index);
  existing.splice(pos, 0, item);
  await db.items.bulkPut(existing.map((i, idx) => ({ ...i, order: idx })));
}

function blankItem(projectId: string, type: SequenceItem["type"]): SequenceItem {
  const t = now();
  return {
    id: uid(),
    projectId,
    type,
    order: 0,
    title: "",
    content: "",
    description: "",
    internalNote: "",
    status: "pending",
    favorite: false,
    dependsOn: [],
    sentAt: null,
    completedAt: null,
    createdAt: t,
    updatedAt: t,
  };
}

function statusTimestamps(status: PromptStatus, prev?: SequenceItem) {
  const t = now();
  return {
    sentAt: status === "sent" ? (prev?.status === "sent" ? prev.sentAt : t) : (prev?.sentAt ?? null),
    completedAt:
      status === "completed" ? (prev?.status === "completed" ? prev.completedAt : t) : null,
  };
}

export async function createPrompt(projectId: string, input: PromptInput, index: number | null) {
  return db.transaction("rw", [db.items, db.projects, db.activity], async () => {
    const items = await db.items.where("projectId").equals(projectId).toArray();
    const err = validateDependencies(null, input.dependsOn, items);
    if (err) throw new Error(err);
    const item = { ...blankItem(projectId, "prompt"), ...input, ...statusTimestamps(input.status) };
    await insertItem(projectId, item, index);
    await touchProject(projectId);
    await log("prompt_created", `Added prompt “${input.title}”`, projectId, item.id);
    return item.id;
  });
}

export async function createNote(projectId: string, input: NoteInput, index: number | null) {
  return db.transaction("rw", [db.items, db.projects, db.activity], async () => {
    const item = { ...blankItem(projectId, "note"), ...input };
    await insertItem(projectId, item, index);
    await touchProject(projectId);
    await log("note_created", `Added note “${input.title}”`, projectId, item.id);
    return item.id;
  });
}

export async function updateItem(id: string, patch: Partial<PromptInput & NoteInput>) {
  await db.transaction("rw", [db.items, db.projects, db.activity], async () => {
    const prev = await db.items.get(id);
    if (!prev) throw new Error("Item no longer exists.");
    if (patch.dependsOn) {
      const items = await db.items.where("projectId").equals(prev.projectId).toArray();
      const err = validateDependencies(id, patch.dependsOn, items);
      if (err) throw new Error(err);
    }
    const ts = patch.status ? statusTimestamps(patch.status, prev) : {};
    await db.items.update(id, { ...patch, ...ts, updatedAt: now() });
    await touchProject(prev.projectId);
    if (prev.type === "prompt")
      await log("prompt_updated", `Edited prompt “${patch.title ?? prev.title}”`, prev.projectId, id);
  });
}

export async function setPromptStatus(id: string, status: PromptStatus) {
  await db.transaction("rw", [db.items, db.projects, db.activity], async () => {
    const prev = await db.items.get(id);
    if (!prev || prev.type !== "prompt") return;
    await db.items.update(id, { status, ...statusTimestamps(status, prev), updatedAt: now() });
    await touchProject(prev.projectId);
    await log(
      status === "sent" ? "prompt_sent" : "prompt_status",
      status === "sent"
        ? `Marked “${prev.title}” as sent`
        : `Set “${prev.title}” to ${PROMPT_STATUS_LABEL[status]}`,
      prev.projectId,
      id,
    );
  });
}

export async function markPromptSent(id: string) {
  await db.transaction("rw", [db.items, db.projects, db.activity], async () => {
    const prev = await db.items.get(id);
    if (!prev) return;
    const t = now();
    await db.items.update(id, { status: "sent", sentAt: t, completedAt: null, updatedAt: t });
    await touchProject(prev.projectId);
    await log("prompt_sent", `Copied & marked “${prev.title}” as sent`, prev.projectId, id);
  });
}

export async function toggleItemFavorite(id: string) {
  const i = await db.items.get(id);
  if (i) await db.items.update(id, { favorite: !i.favorite });
}

export async function deleteItem(id: string) {
  await db.transaction("rw", [db.items, db.attachments, db.projects, db.activity], async () => {
    const item = await db.items.get(id);
    if (!item) return;
    await db.items.delete(id);
    await db.attachments.where("itemId").equals(id).delete();
    const rest = await db.items.where("projectId").equals(item.projectId).sortBy("order");
    await db.items.bulkPut(
      rest.map((i, idx) => ({
        ...i,
        order: idx,
        dependsOn: i.dependsOn.filter((d) => d !== id),
      })),
    );
    await touchProject(item.projectId);
    await log(
      item.type === "prompt" ? "prompt_deleted" : "note_deleted",
      `Deleted ${item.type} “${item.title}”`,
      item.projectId,
    );
  });
}

export async function duplicateItem(id: string) {
  return db.transaction("rw", [db.items, db.projects, db.activity], async () => {
    const item = await db.items.get(id);
    if (!item) return null;
    const t = now();
    const copy: SequenceItem = {
      ...item,
      id: uid(),
      title: `${item.title} (Copy)`,
      status: item.type === "prompt" ? "pending" : item.status,
      sentAt: null,
      completedAt: null,
      favorite: false,
      createdAt: t,
      updatedAt: t,
    };
    const ordered = await db.items.where("projectId").equals(item.projectId).sortBy("order");
    const idx = ordered.findIndex((i) => i.id === id);
    await insertItem(item.projectId, copy, idx + 1);
    await touchProject(item.projectId);
    await log(
      item.type === "prompt" ? "prompt_created" : "note_created",
      `Duplicated ${item.type} “${item.title}”`,
      item.projectId,
      copy.id,
    );
    return copy.id;
  });
}

/** Persist a new ordering (array of item ids). Dependencies are id-based, so they survive reordering. */
export async function reorderItems(projectId: string, orderedIds: string[]) {
  await db.transaction("rw", [db.items, db.projects, db.activity], async () => {
    const items = await db.items.where("projectId").equals(projectId).toArray();
    const byId = new Map(items.map((i) => [i.id, i]));
    const next = orderedIds
      .map((id) => byId.get(id))
      .filter((i): i is SequenceItem => !!i)
      .map((i, idx) => ({ ...i, order: idx }));
    await db.items.bulkPut(next);
    await touchProject(projectId);
  });
}

/* ------------------------------ attachments ------------------------------ */

export const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;

export async function addAttachments(projectId: string, itemId: string | null, files: File[]) {
  const rows: Attachment[] = files.map((f) => ({
    id: uid(),
    projectId,
    itemId,
    name: f.name,
    mime: f.type || guessMime(f.name),
    size: f.size,
    // Store a plain Blob copy so the data is fully owned by IndexedDB.
    blob: new Blob([f], { type: f.type || guessMime(f.name) }),
    createdAt: now(),
  }));
  await db.transaction("rw", [db.attachments, db.projects, db.activity], async () => {
    await db.attachments.bulkAdd(rows);
    await touchProject(projectId);
    await log(
      "attachment_added",
      rows.length === 1 ? `Attached “${rows[0].name}”` : `Attached ${rows.length} files`,
      projectId,
      itemId,
    );
  });
  return rows.length;
}

export async function deleteAttachment(id: string) {
  await db.transaction("rw", [db.attachments, db.projects, db.activity], async () => {
    const a = await db.attachments.get(id);
    if (!a) return;
    await db.attachments.delete(id);
    await touchProject(a.projectId);
    await log("attachment_removed", `Removed “${a.name}”`, a.projectId, a.itemId);
  });
}

export async function clearAllData() {
  await db.transaction("rw", [db.projects, db.items, db.attachments, db.activity], async () => {
    await Promise.all([
      db.projects.clear(),
      db.items.clear(),
      db.attachments.clear(),
      db.activity.clear(),
    ]);
  });
}

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    md: "text/markdown",
    markdown: "text/markdown",
    txt: "text/plain",
    json: "application/json",
    pdf: "application/pdf",
    zip: "application/zip",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    csv: "text/csv",
  };
  return map[ext] ?? "application/octet-stream";
}
