import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { Attachment, Project, SequenceItem } from "./types";

// Live (reactive) IndexedDB queries. `undefined` means "still loading".

export const useProjects = () => useLiveQuery<Project[]>(() => db.projects.toArray(), []);

export const useProject = (id: string | undefined) =>
  useLiveQuery<Project | null>(async () => (id ? ((await db.projects.get(id)) ?? null) : null), [id]);

export const useAllItems = () => useLiveQuery<SequenceItem[]>(() => db.items.toArray(), []);

export const useProjectItems = (projectId: string | undefined) =>
  useLiveQuery<SequenceItem[]>(
    () => (projectId ? db.items.where("projectId").equals(projectId).sortBy("order") : []),
    [projectId],
  );

export const useAllAttachments = () =>
  useLiveQuery<Attachment[]>(() => db.attachments.orderBy("createdAt").reverse().toArray(), []);

export const useAttachments = (projectId: string, itemId: string | null) =>
  useLiveQuery<Attachment[]>(
    () =>
      itemId
        ? db.attachments.where("itemId").equals(itemId).toArray()
        : db.attachments
            .where("projectId")
            .equals(projectId)
            .filter((a) => a.itemId === null)
            .toArray(),
    [projectId, itemId],
  );

export const useRecentActivity = (limit = 12) =>
  useLiveQuery(() => db.activity.orderBy("createdAt").reverse().limit(limit).toArray(), [limit]);

/** Object URL for a stored Blob, revoked on unmount. The Blob itself stays in IndexedDB. */
export function useObjectUrl(blob: Blob | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
