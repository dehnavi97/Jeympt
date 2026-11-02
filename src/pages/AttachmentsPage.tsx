import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Paperclip, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllAttachments, useAllItems, useProjects } from "@/lib/hooks";
import { fileSize } from "@/lib/format";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/ui";
import { AttachmentCard } from "@/components/attachments/AttachmentsManager";
import type { Attachment } from "@/lib/types";

type Kind = "all" | "image" | "document" | "data" | "archive" | "other";
const KIND_LABEL: Record<Kind, string> = { all: "All types", image: "Images", document: "Documents (PDF, TXT, MD)", data: "Data (JSON, CSV)", archive: "Archives (ZIP)", other: "Other" };

function kindOf(a: Attachment): Kind {
  const n = a.name.toLowerCase();
  if (a.mime.startsWith("image/")) return "image";
  if (a.mime === "application/pdf" || /\.(txt|md|markdown|docx?|rtf|odt)$/.test(n) || a.mime.startsWith("text/plain") || a.mime === "text/markdown") return "document";
  if (a.mime === "application/json" || /\.(json|csv|ya?ml|xml)$/.test(n)) return "data";
  if (/\.(zip|rar|7z|tar|gz)$/.test(n) || a.mime.includes("zip")) return "archive";
  return "other";
}

export default function AttachmentsPage() {
  const atts = useAllAttachments();
  const projects = useProjects();
  const items = useAllItems();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const pmap = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);
  const imap = useMemo(() => new Map((items ?? []).map((i) => [i.id, i])), [items]);

  const list = useMemo(
    () =>
      (atts ?? []).filter(
        (a) => (kind === "all" || kindOf(a) === kind) && (!q.trim() || a.name.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [atts, q, kind],
  );
  const total = (atts ?? []).reduce((s, a) => s + a.size, 0);

  return (
    <>
      <PageHeader title="Attachments" subtitle={`All files stored locally across your projects · ${atts?.length ?? 0} files · ${fileSize(total)}`} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search file names…" className="pl-8" data-testid="attachments-search-input" />
        </div>
        <Select value={kind} onValueChange={(v: string) => setKind(v as Kind)}>
          <SelectTrigger className="w-56" data-testid="attachments-kind-filter">
            <SelectValue>{(v) => KIND_LABEL[v as Kind]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
              <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {atts === undefined ? (
        <LoadingRows />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title={atts.length ? "No files match" : "No attachments yet"}
          description={atts.length ? "Try a different search or type." : "Upload files from a project's “Project files” tab or from a prompt's editor."}
          testId="attachments-page-empty"
        />
      ) : (
        <div className="grid gap-2 md:grid-cols-2" data-testid="attachments-page-list">
          {list.map((a) => {
            const p = pmap.get(a.projectId);
            const it = a.itemId ? imap.get(a.itemId) : null;
            return (
              <AttachmentCard
                key={a.id}
                a={a}
                context={
                  p ? (
                    <>
                      <Link to={`/projects/${p.id}`} className="hover:text-foreground hover:underline">{p.name}</Link>
                      {it && (
                        <>
                          {" · "}
                          <Link to={`/projects/${p.id}/prompts/${it.id}`} className="hover:text-foreground hover:underline">{it.title}</Link>
                        </>
                      )}
                    </>
                  ) : null
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
}
