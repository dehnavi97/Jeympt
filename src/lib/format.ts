import { formatDistanceToNowStrict, format } from "date-fns";

export const timeAgo = (ts: number | null | undefined) =>
  ts ? `${formatDistanceToNowStrict(ts)} ago` : "Never";

export const fullDate = (ts: number | null | undefined) =>
  ts ? format(ts, "MMM d, yyyy · HH:mm") : "—";

export const shortDate = (ts: number | null | undefined) => (ts ? format(ts, "MMM d, yyyy") : "—");

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function fileKind(mime: string, name: string): string {
  const ext = name.split(".").pop()?.toUpperCase() ?? "";
  if (mime.startsWith("image/")) return ext || "IMAGE";
  if (ext) return ext.slice(0, 5);
  return "FILE";
}

export const isPreviewableImage = (mime: string) =>
  ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"].includes(mime);

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
