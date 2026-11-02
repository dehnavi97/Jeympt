import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity as ActivityIcon,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  Lock,
  PlayCircle,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAllItems, useProjects, useRecentActivity } from "@/lib/hooks";
import { EMPTY_PROGRESS, indexItems, nextActionable, progressByProject, progressOf, promptNumbers, promptState } from "@/lib/workflow";
import { copyAndMarkSent } from "@/lib/promptActions";
import { useDialogs } from "@/components/dialogs/DialogsProvider";
import { EmptyState, LoadingRows, PageHeader, ProgressBar, ProjectIcon, ProjectStatusBadge } from "@/components/common/ui";
import { colorHex } from "@/lib/projectStyle";
import { pad2, timeAgo } from "@/lib/format";
import type { Project } from "@/lib/types";

function Stat({ label, value, icon: Icon, hint, testId }: { label: string; value: number | string; icon: LucideIcon; hint?: string; testId: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3.5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]" data-testid={testId}>
      <div className="flex items-center justify-between text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
        <Icon className="size-3.5" />
      </div>
      <div className="mt-1.5 font-mono text-2xl font-semibold tracking-tight" data-testid={`${testId}-value`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function MiniProjectList({ title, projects, empty, testId, meta }: { title: string; projects: Project[]; empty: string; testId: string; meta: (p: Project) => string }) {
  return (
    <section className="rounded-xl border bg-card" data-testid={testId}>
      <h2 className="border-b px-4 py-3 text-sm font-semibold">{title}</h2>
      {projects.length === 0 ? (
        <p className="px-4 py-6 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul>
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50" data-testid={`${testId}-item-${p.id}`}>
                <ProjectIcon icon={p.icon} color={p.color} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[13px]">{p.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{meta(p)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Dashboard() {
  const projects = useProjects();
  const items = useAllItems();
  const activity = useRecentActivity(10);
  const { openProject } = useDialogs();

  const data = useMemo(() => {
    if (!projects || !items) return null;
    const prompts = items.filter((i) => i.type === "prompt");
    const overall = progressOf(items);
    const byProject = progressByProject(items);
    const inProgress = prompts.filter((p) => p.status === "in_progress").length;
    const continueWorking = projects
      .filter((p) => p.status !== "archived" && p.status !== "completed")
      .map((p) => {
        const its = items.filter((i) => i.projectId === p.id);
        return { project: p, progress: byProject.get(p.id) ?? EMPTY_PROGRESS, next: nextActionable(its), its };
      })
      .filter((x) => x.progress.pending > 0)
      .sort((a, b) => (b.project.lastAccessedAt ?? b.project.updatedAt) - (a.project.lastAccessedAt ?? a.project.updatedAt))
      .slice(0, 4);
    return {
      prompts,
      overall,
      inProgress,
      continueWorking,
      recentUpdated: [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
      recentAccessed: projects
        .filter((p) => p.lastAccessedAt)
        .sort((a, b) => (b.lastAccessedAt ?? 0) - (a.lastAccessedAt ?? 0))
        .slice(0, 5),
    };
  }, [projects, items]);

  const header = (
    <PageHeader
      title="Dashboard"
      subtitle="Your workspace at a glance — everything is calculated from your local data."
      actions={
        <Button onClick={() => openProject()} data-testid="dashboard-new-project-button">
          <Plus className="size-4" /> New Project
        </Button>
      }
    />
  );

  if (!data || !projects)
    return (
      <>
        {header}
        <LoadingRows rows={4} />
      </>
    );

  if (projects.length === 0)
    return (
      <>
        {header}
        <div className="grid gap-6 rounded-2xl border bg-card p-6 md:grid-cols-[1.1fr_1fr] md:p-10" data-testid="dashboard-empty-state">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-brand-subtle px-2.5 py-1 text-[11px] font-medium text-brand-foreground">
              <Sparkles className="size-3" /> Welcome to Jeympt
            </span>
            <h2 className="text-3xl font-semibold tracking-tight">Organize. Execute. Keep Moving.</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Break long AI workflows into ordered prompts, copy each one into Google AI Studio, Jules, ChatGPT or Claude, and always know what comes next.
            </p>
            <Button size="lg" onClick={() => openProject()} data-testid="create-first-project-button">
              <Plus className="size-4" /> Create Your First Project
            </Button>
          </div>
          <ol className="space-y-3 self-center">
            {[
              ["Create a project", "Group every prompt for one goal in a single place."],
              ["Add prompts & notes", "Order steps, set prerequisites, leave reminders between them."],
              ["Copy & Mark as Sent", "One click copies the prompt and moves you to the next step."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3 rounded-xl border bg-background p-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted font-mono text-[11px] font-semibold">{pad2(i + 1)}</span>
                <div>
                  <div className="text-[13px] font-medium">{t}</div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </>
    );

  const { overall } = data;
  const seg = (n: number) => (overall.total ? `${(n / overall.total) * 100}%` : "0%");

  return (
    <>
      {header}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" data-testid="dashboard-stats">
        <Stat label="Projects" value={projects.length} icon={FolderKanban} testId="stat-total-projects" />
        <Stat label="Active" value={projects.filter((p) => p.status === "active").length} icon={PlayCircle} testId="stat-active-projects" />
        <Stat label="Completed" value={projects.filter((p) => p.status === "completed").length} icon={CheckCircle2} testId="stat-completed-projects" />
        <Stat label="Prompts" value={overall.total} icon={FileText} testId="stat-total-prompts" />
        <Stat label="Sent" value={overall.sent} icon={Send} hint={`${overall.completed} completed`} testId="stat-sent-prompts" />
        <Stat label="Pending" value={overall.pending} icon={Clock} hint={`${overall.blocked} blocked`} testId="stat-pending-prompts" />
      </div>

      <section className="rounded-xl border bg-card p-4 md:p-5" data-testid="overall-progress">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Overall progress</h2>
          <span className="font-mono text-sm font-semibold" data-testid="overall-progress-percent">{overall.percent}%</span>
        </div>
        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="bg-slate-400 transition-[width] duration-500" style={{ width: seg(overall.completed) }} />
          <div className="bg-emerald-500 transition-[width] duration-500" style={{ width: seg(overall.sent) }} />
          <div className="bg-blue-500 transition-[width] duration-500" style={{ width: seg(data.inProgress) }} />
          <div className="bg-red-400 transition-[width] duration-500" style={{ width: seg(overall.blocked) }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
          {[
            ["bg-slate-400", "Completed", overall.completed],
            ["bg-emerald-500", "Sent", overall.sent],
            ["bg-blue-500", "In progress", data.inProgress],
            ["bg-red-400", "Blocked", overall.blocked],
            ["bg-muted-foreground/20", "Other pending", Math.max(0, overall.pending - data.inProgress - overall.blocked)],
          ].map(([c, l, n]) => (
            <span key={l as string} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-sm", c as string)} /> {l} <span className="font-mono text-foreground">{n}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3" data-testid="continue-working">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Continue working</h2>
          <Link to="/projects" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            All projects <ArrowRight className="size-3" />
          </Link>
        </div>
        {data.continueWorking.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nothing waiting" description="Every prompt in your active projects has been sent or completed." testId="continue-working-empty" className="py-6" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.continueWorking.map(({ project, progress, next, its }) => {
              const numbers = promptNumbers(its);
              const byId = indexItems(its);
              const blockedOnly = !next;
              const firstBlocked = blockedOnly ? its.filter((i) => i.type === "prompt" && promptState(i, byId).blocked).sort((a, b) => a.order - b.order)[0] : null;
              return (
                <div key={project.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4" data-testid={`continue-card-${project.id}`}>
                  <div className="flex items-center gap-3">
                    <ProjectIcon icon={project.icon} color={project.color} />
                    <div className="min-w-0 flex-1">
                      <Link to={`/projects/${project.id}`} className="block truncate text-sm font-semibold hover:underline">{project.name}</Link>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <ProjectStatusBadge status={project.status} /> {progress.done}/{progress.total} done
                      </div>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{progress.percent}%</span>
                  </div>
                  <ProgressBar value={progress.percent} color={colorHex(project.color)} />
                  {next ? (
                    <div className="flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-subtle/50 px-3 py-2">
                      <span className="font-mono text-[11px] font-semibold text-brand-foreground">{pad2(numbers.get(next.id) ?? 0)}</span>
                      <Link to={`/projects/${project.id}?focus=${next.id}`} className="min-w-0 flex-1 truncate text-[13px] font-medium hover:underline" data-testid={`continue-next-${project.id}`}>
                        {next.title}
                      </Link>
                      <Button size="xs" onClick={() => void copyAndMarkSent(next)} data-testid={`continue-copy-send-${project.id}`}>
                        <Send className="size-3" /> Copy & Send
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                      <Lock className="size-3.5" /> Remaining prompts are blocked{firstBlocked ? ` — starting with “${firstBlocked.title}”` : ""}.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <MiniProjectList title="Recently updated" projects={data.recentUpdated} empty="No projects yet." testId="recently-updated" meta={(p) => timeAgo(p.updatedAt)} />
        <MiniProjectList title="Recently opened" projects={data.recentAccessed} empty="Projects you open will appear here." testId="recently-accessed" meta={(p) => timeAgo(p.lastAccessedAt)} />
        <section className="rounded-xl border bg-card" data-testid="recent-activity">
          <h2 className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold">
            <ActivityIcon className="size-3.5 text-muted-foreground" /> Recent activity
          </h2>
          {!activity || activity.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 px-4 py-2.5" data-testid={`activity-${a.id}`}>
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", a.kind === "prompt_sent" ? "bg-emerald-500" : a.kind.includes("deleted") || a.kind.includes("removed") ? "bg-red-400" : "bg-brand")} />
                  <div className="min-w-0 flex-1">
                    {a.projectId ? (
                      <Link to={`/projects/${a.projectId}`} className="line-clamp-2 text-[13px] hover:underline">{a.message}</Link>
                    ) : (
                      <span className="line-clamp-2 text-[13px]">{a.message}</span>
                    )}
                    <div className="text-[11px] text-muted-foreground">{timeAgo(a.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

