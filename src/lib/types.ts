export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type PromptStatus = "pending" | "ready" | "in_progress" | "sent" | "completed" | "blocked";
export type ItemType = "prompt" | "note";

export interface Project {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon key from PROJECT_ICONS
  color: string; // accent color key from PROJECT_COLORS
  status: ProjectStatus;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number | null;
}

export interface SequenceItem {
  id: string;
  projectId: string;
  type: ItemType;
  order: number;
  title: string;
  content: string;
  // prompt-only fields (kept empty for notes)
  description: string;
  internalNote: string;
  status: PromptStatus;
  favorite: boolean;
  dependsOn: string[];
  sentAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Attachment {
  id: string;
  projectId: string;
  itemId: string | null;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

export type ActivityKind =
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "project_duplicated"
  | "project_archived"
  | "project_restored"
  | "prompt_created"
  | "prompt_updated"
  | "prompt_deleted"
  | "prompt_sent"
  | "prompt_status"
  | "note_created"
  | "note_deleted"
  | "attachment_added"
  | "attachment_removed"
  | "reordered";

export interface Activity {
  id: string;
  projectId: string | null;
  itemId: string | null;
  kind: ActivityKind;
  message: string;
  createdAt: number;
}

export const PROJECT_STATUSES: ProjectStatus[] = ["active", "paused", "completed", "archived"];
export const PROMPT_STATUSES: PromptStatus[] = [
  "pending",
  "ready",
  "in_progress",
  "sent",
  "completed",
  "blocked",
];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export const PROMPT_STATUS_LABEL: Record<PromptStatus, string> = {
  pending: "Pending",
  ready: "Ready",
  in_progress: "In Progress",
  sent: "Sent",
  completed: "Completed",
  blocked: "Blocked",
};
