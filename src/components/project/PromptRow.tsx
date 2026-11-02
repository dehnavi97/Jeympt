import { Link } from "react-router-dom";
import { Copy, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PromptStatusBadge, ProjectIcon, Tip } from "@/components/common/ui";
import { copyAndMarkSent, copyOnly } from "@/lib/promptActions";
import { toggleItemFavorite } from "@/lib/ops";
import { timeAgo } from "@/lib/format";
import type { PromptState } from "@/lib/workflow";
import type { Project, SequenceItem } from "@/lib/types";

export function PromptRow({ item, project, state }: { item: SequenceItem; project?: Project; state: PromptState }) {
  return (
    <div className="group flex items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40" data-testid={`prompt-row-${item.id}`}>
      <Tip label={item.favorite ? "Remove from favorites" : "Add to favorites"}>
        <button type="button" onClick={() => void toggleItemFavorite(item.id)} aria-label="Toggle favorite" className="grid size-6 place-items-center rounded text-muted-foreground hover:text-foreground" data-testid={`prompt-row-favorite-${item.id}`}>
          <Star className={cn("size-3.5", item.favorite && "fill-amber-400 text-amber-400")} />
        </button>
      </Tip>
      <div className="min-w-0 flex-1">
        <Link to={`/projects/${item.projectId}/prompts/${item.id}`} className="block truncate text-[13px] font-medium hover:underline" data-testid={`prompt-row-title-${item.id}`}>
          {item.title}
        </Link>
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {project && (
            <Link to={`/projects/${project.id}`} className="flex min-w-0 items-center gap-1.5 hover:text-foreground">
              <ProjectIcon icon={project.icon} color={project.color} size="sm" />
              <span className="truncate">{project.name}</span>
            </Link>
          )}
          <span className="hidden truncate font-mono text-[11px] opacity-80 md:inline">· {item.content.slice(0, 90).replace(/\s+/g, " ")}</span>
        </div>
      </div>
      <PromptStatusBadge status={item.status} waiting={state.blocked && state.unmetDeps.length > 0} />
      <span className="hidden w-20 text-right text-[11px] text-muted-foreground lg:block">{timeAgo(item.updatedAt)}</span>
      <div className="flex shrink-0 items-center gap-1">
        <Tip label="Copy only">
          <Button variant="ghost" size="icon-sm" onClick={() => void copyOnly(item)} aria-label="Copy only" data-testid={`prompt-row-copy-${item.id}`}>
            <Copy className="size-3.5" />
          </Button>
        </Tip>
        <Tip label={state.done ? "Already done" : state.blocked ? (state.blockedReason ?? "Blocked") : "Copy & Mark as Sent"}>
          <span>
            <Button variant="ghost" size="icon-sm" disabled={state.done || state.blocked} onClick={() => void copyAndMarkSent(item)} aria-label="Copy & Mark as Sent" data-testid={`prompt-row-copy-send-${item.id}`}>
              <Send className="size-3.5" />
            </Button>
          </span>
        </Tip>
      </div>
    </div>
  );
}
