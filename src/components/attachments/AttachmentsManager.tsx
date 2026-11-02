import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileArchive, FileCode2, FileImage, FileText, File as FileIcon, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAttachments, useObjectUrl } from "@/lib/hooks";
import { addAttachments, deleteAttachment, MAX_ATTACHMENT_BYTES } from "@/lib/ops";
import { downloadBlob, fileKind, fileSize, fullDate, isPreviewableImage, shortDate } from "@/lib/format";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { EmptyState, Tip } from "@/components/common/ui";
import type { Attachment } from "@/lib/types";

const isTextLike = (a: Attachment) =>
  a.mime.startsWith("text/") ||
  a.mime === "application/json" ||
  /\.(md|markdown|txt|json|csv|log|ya?ml|xml|js|ts|tsx|py|html|css)$/i.test(a.name);

function KindIcon({ a, className }: { a: Attachment; className?: string }) {
  if (a.mime.startsWith("image/")) return <FileImage className={className} />;
  if (a.mime.includes("zip") || /\.(zip|rar|7z|tar|gz)$/i.test(a.name)) return <FileArchive className={className} />;
  if (a.mime === "application/json" || /\.(json|js|ts|py|html|css)$/i.test(a.name)) return <FileCode2 className={className} />;
  if (isTextLike(a) || a.mime === "application/pdf") return <FileText className={className} />;
  return <FileIcon className={className} />;
}

function Thumb({ a }: { a: Attachment }) {
  const url = useObjectUrl(isPreviewableImage(a.mime) ? a.blob : null);
  if (url)
    return <img src={url} alt={a.name} className="size-full object-cover" data-testid={`attachment-thumb-${a.id}`} />;
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
      <KindIcon a={a} className="size-5" />
      <span className="font-mono text-[9px] font-semibold tracking-wide">{fileKind(a.mime, a.name)}</span>
    </div>
  );
}

export function AttachmentPreviewDialog({ a, onClose }: { a: Attachment; onClose: () => void }) {
  const url = useObjectUrl(isPreviewableImage(a.mime) || a.mime === "application/pdf" ? a.blob : null);
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (isTextLike(a)) void a.blob.text().then((t) => setText(t.slice(0, 200_000)));
  }, [a]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl" data-testid="attachment-preview-dialog">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{a.name}</DialogTitle>
          <DialogDescription>
            {fileKind(a.mime, a.name)} · {fileSize(a.size)} · uploaded {fullDate(a.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-auto rounded-lg border bg-muted/40">
          {isPreviewableImage(a.mime) && url ? (
            <img src={url} alt={a.name} className="mx-auto max-h-[65vh] object-contain" />
          ) : a.mime === "application/pdf" && url ? (
            <iframe src={url} title={a.name} className="h-[65vh] w-full" />
          ) : text !== null ? (
            <pre className="max-h-[65vh] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">{text}</pre>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No inline preview for this file type. Download it to open.
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => downloadBlob(a.blob, a.name)} data-testid="attachment-preview-download">
            <Download className="size-4" /> Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AttachmentCard({ a, context }: { a: Attachment; context?: ReactNode }) {
  const confirm = useConfirm();
  const [preview, setPreview] = useState(false);
  const remove = async () => {
    if (!(await confirm({ title: `Remove “${a.name}”?`, description: "The file will be permanently deleted from local storage.", confirmLabel: "Remove" })))
      return;
    await deleteAttachment(a.id);
    toast.success("Attachment removed");
  };
  return (
    <div
      className="group flex items-center gap-3 rounded-lg border bg-card p-2 transition-shadow duration-200 hover:shadow-[0_8px_20px_-6px_rgba(15,23,42,0.12)]"
      data-testid={`attachment-card-${a.id}`}
    >
      <button
        type="button"
        onClick={() => setPreview(true)}
        className="size-12 shrink-0 overflow-hidden rounded-md border bg-muted/50"
        aria-label={`Preview ${a.name}`}
        data-testid={`attachment-open-${a.id}`}
      >
        <Thumb a={a} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium" data-testid={`attachment-name-${a.id}`}>{a.name}</div>
        <div className="truncate text-[11px] text-muted-foreground">
          <span className="font-mono">{fileKind(a.mime, a.name)}</span> · {fileSize(a.size)} · {shortDate(a.createdAt)}
        </div>
        {context && <div className="truncate text-[11px] text-muted-foreground">{context}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity md:opacity-60 md:group-hover:opacity-100">
        <Tip label="Preview">
          <Button variant="ghost" size="icon-sm" onClick={() => setPreview(true)} aria-label="Preview" data-testid={`attachment-preview-${a.id}`}>
            <Eye className="size-3.5" />
          </Button>
        </Tip>
        <Tip label="Download">
          <Button variant="ghost" size="icon-sm" onClick={() => downloadBlob(a.blob, a.name)} aria-label="Download" data-testid={`attachment-download-${a.id}`}>
            <Download className="size-3.5" />
          </Button>
        </Tip>
        <Tip label="Remove">
          <Button variant="ghost" size="icon-sm" onClick={() => void remove()} aria-label="Remove" className="hover:text-destructive" data-testid={`attachment-delete-${a.id}`}>
            <Trash2 className="size-3.5" />
          </Button>
        </Tip>
      </div>
      {preview && <AttachmentPreviewDialog a={a} onClose={() => setPreview(false)} />}
    </div>
  );
}

export default function AttachmentsManager({
  projectId,
  itemId,
  title = "Attachments",
}: {
  projectId: string;
  itemId: string | null;
  title?: string;
}) {
  const files = useAttachments(projectId, itemId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const scope = itemId ? "prompt" : "project";

  const upload = async (list: FileList | File[] | null) => {
    const arr = Array.from(list ?? []);
    if (!arr.length) return;
    const tooBig = arr.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    const ok = arr.filter((f) => f.size <= MAX_ATTACHMENT_BYTES);
    if (tooBig.length) toast.error(`${tooBig.length} file(s) exceed the 100 MB limit and were skipped`);
    if (!ok.length) return;
    setBusy(true);
    try {
      const n = await addAttachments(projectId, itemId, ok);
      toast.success(n === 1 ? "File attached" : `${n} files attached`);
    } catch (e) {
      toast.error("Upload failed", { description: e instanceof Error ? e.message : "Storage may be full." });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section className="space-y-3" data-testid={`attachments-manager-${scope}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {title} <span className="ml-1 font-mono text-xs font-normal text-muted-foreground" data-testid={`attachments-count-${scope}`}>{files?.length ?? 0}</span>
        </h3>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy} data-testid={`attachments-upload-button-${scope}`}>
          <UploadCloud className="size-3.5" /> Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
          data-testid={`attachments-file-input-${scope}`}
        />
      </div>
      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        data-testid={`attachments-dropzone-${scope}`}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-4 text-xs text-muted-foreground transition-colors hover:border-brand/50 hover:bg-brand-subtle/40",
          over && "border-brand bg-brand-subtle text-brand-foreground",
        )}
      >
        <UploadCloud className="size-4" />
        {busy ? "Saving to local storage…" : "Drop files here or click to browse — images, PDF, JSON, TXT, Markdown, ZIP…"}
      </div>
      {files === undefined ? null : files.length === 0 ? (
        <EmptyState
          icon={FileIcon}
          title={`No ${scope} attachments`}
          description="Reference files stay on this device inside the local database."
          className="py-6"
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((a) => (
            <AttachmentCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </section>
  );
}
