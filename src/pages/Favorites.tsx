import { useMemo } from "react";
import { Star } from "lucide-react";
import { useAllItems, useProjects } from "@/lib/hooks";
import { EMPTY_PROGRESS, indexItems, progressByProject, promptState } from "@/lib/workflow";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/ui";
import { ProjectCard } from "@/components/project/ProjectCard";
import { PromptRow } from "@/components/project/PromptRow";

export default function Favorites() {
  const projects = useProjects();
  const items = useAllItems();
  const progress = useMemo(() => progressByProject(items ?? []), [items]);
  const byId = useMemo(() => indexItems(items ?? []), [items]);
  const pmap = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);

  if (!projects || !items)
    return (
      <>
        <PageHeader title="Favorites" />
        <LoadingRows />
      </>
    );

  const favProjects = projects.filter((p) => p.favorite).sort((a, b) => b.updatedAt - a.updatedAt);
  const favPrompts = items.filter((i) => i.type === "prompt" && i.favorite && pmap.has(i.projectId)).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <>
      <PageHeader title="Favorites" subtitle="Starred projects and prompts you reuse often." />
      <section className="space-y-3" data-testid="favorite-projects">
        <h2 className="text-sm font-semibold">Projects <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">{favProjects.length}</span></h2>
        {favProjects.length === 0 ? (
          <EmptyState icon={Star} title="No favorite projects" description="Star a project from its card or header to pin it here and in the sidebar." className="py-6" testId="favorite-projects-empty" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {favProjects.map((p) => (
              <ProjectCard key={p.id} project={p} progress={progress.get(p.id) ?? EMPTY_PROGRESS} />
            ))}
          </div>
        )}
      </section>
      <section className="space-y-3" data-testid="favorite-prompts">
        <h2 className="text-sm font-semibold">Prompts <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">{favPrompts.length}</span></h2>
        {favPrompts.length === 0 ? (
          <EmptyState icon={Star} title="No favorite prompts" description="Star reusable prompts to copy them quickly from here." className="py-6" testId="favorite-prompts-empty" />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            {favPrompts.map((i) => (
              <PromptRow key={i.id} item={i} project={pmap.get(i.projectId)} state={promptState(i, byId)} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
