import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Archive, ArchiveRestore, CopyPlus, FileText, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ProgressBar, ProjectIcon, ProjectStatusBadge } from "@/components/common/ui";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { useDialogs } from "@/components/dialogs/DialogsProvider";
import { deleteProject, duplicateProject, setProjectStatus, toggleProjectFavorite } from "@/lib/ops";
import { colorHex } from "@/lib/projectStyle";
import { timeAgo } from "@/lib/format";
import type { Progress } from "@/lib/workflow";
import type { Project } from "@/lib/types";

export function ProjectMenu({ project, onDeleted }: { project: Project; onDeleted?: () => void }) {
  const { openProject } = useDialogs();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const archived = project.status === "archived";

  const remove = async () => {
    if (
      !(await confirm({
        title: `Delete “${project.name}”?`,
        description: "All prompts, notes and attachments in this project will be permanently deleted. This cannot be undone.",
        confirmLabel: "Delete project",
      }))
    )
      return;
    await deleteProject(project.id);
    toast.success("Project deleted");
    onDeleted?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Project actions" data-testid={`project-menu-${project.id}`} onClick={(e) => e.stopPropagation()} />}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => openProject(project)} data-testid={`project-edit-${project.id}`}>
          <Pencil className="size-4" /> Edit details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void toggleProjectFavorite(project.id)} data-testid={`project-toggle-favorite-${project.id}`}>
          <Star className="size-4" /> {project.favorite ? "Remove from favorites" : "Add to favorites"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            void duplicateProject(project.id).then((id) => {
              toast.success("Project duplicated");
              if (id) navigate(`/projects/${id}`);
            })
          }
          data-testid={`project-duplicate-${project.id}`}
        >
          <CopyPlus className="size-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            void setProjectStatus(project.id, archived ? "active" : "archived").then(() =>
              toast.success(archived ? "Project restored" : "Project archived"),
            )
          }
          data-testid={`project-archive-${project.id}`}
        >
          {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          {archived ? "Restore" : "Archive"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void remove()} data-testid={`project-delete-${project.id}`}>
          <Trash2 className="size-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FavStar({ project }: { project: Project }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleProjectFavorite(project.id);
      }}
      aria-label="Toggle favorite"
      data-testid={`project-favorite-${project.id}`}
      className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Star className={cn("size-3.5", project.favorite && "fill-amber-400 text-amber-400")} />
    </button>
  );
}

export function ProjectCard({ project, progress }: { project: Project; progress: Progress }) {
  return (
    <div
      className="group relative flex flex-col rounded-xl border bg-card p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/10 hover:shadow-[0_8px_20px_-4px_rgba(15,23,42,0.10)] motion-reduce:transform-none"
      data-testid={`project-card-${project.id}`}
    >
      <Link to={`/projects/${project.id}`} className="absolute inset-0 z-0 rounded-xl" aria-label={`Open ${project.name}`} data-testid={`project-open-${project.id}`} />
      <div className="pointer-events-none relative z-[1] flex items-start gap-3">
        <ProjectIcon icon={project.icon} color={project.color} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" data-testid={`project-name-${project.id}`}>{project.name}</div>
          <div className="mt-0.5"><ProjectStatusBadge status={project.status} testId={`project-status-${project.id}`} /></div>
        </div>
        <div className="pointer-events-auto flex items-center">
          <FavStar project={project} />
          <ProjectMenu project={project} />
        </div>
      </div>
      <p className="pointer-events-none relative z-[1] mt-3 line-clamp-2 min-h-[2.5rem] text-[13px] text-muted-foreground">
        {project.description || <span className="italic opacity-70">No description</span>}
      </p>
      <div className="pointer-events-none relative z-[1] mt-4 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1" data-testid={`project-prompt-count-${project.id}`}>
            <FileText className="size-3" /> {progress.total} prompt{progress.total === 1 ? "" : "s"}
          </span>
          <span className="font-mono" data-testid={`project-progress-${project.id}`}>{progress.done}/{progress.total} · {progress.percent}%</span>
        </div>
        <ProgressBar value={progress.percent} color={colorHex(project.color)} />
        <div className="text-[11px] text-muted-foreground">Updated {timeAgo(project.updatedAt)}</div>
      </div>
    </div>
  );
}

export function ProjectRow({ project, progress }: { project: Project; progress: Progress }) {
  return (
    <div
      className="group relative flex items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
      data-testid={`project-row-${project.id}`}
    >
      <Link to={`/projects/${project.id}`} className="absolute inset-0 z-0" aria-label={`Open ${project.name}`} data-testid={`project-row-open-${project.id}`} />
      <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 items-center gap-3">
        <ProjectIcon icon={project.icon} color={project.color} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{project.name}</div>
          <div className="truncate text-xs text-muted-foreground">{project.description || "No description"}</div>
        </div>
        <div className="hidden w-20 sm:block"><ProjectStatusBadge status={project.status} /></div>
        <div className="hidden w-16 text-right font-mono text-xs text-muted-foreground md:block">{progress.total} prompts</div>
        <div className="hidden w-32 items-center gap-2 md:flex">
          <ProgressBar value={progress.percent} color={colorHex(project.color)} />
          <span className="w-8 text-right font-mono text-[11px] text-muted-foreground">{progress.percent}%</span>
        </div>
        <div className="hidden w-24 text-right text-xs text-muted-foreground lg:block">{timeAgo(project.updatedAt)}</div>
      </div>
      <div className="relative z-[1] flex items-center">
        <FavStar project={project} />
        <ProjectMenu project={project} />
      </div>
    </div>
  );
}
