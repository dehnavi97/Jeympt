import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { colorHex, iconFor } from "@/lib/projectStyle";
import type { ProjectStatus, PromptStatus } from "@/lib/types";
import { PROJECT_STATUS_LABEL, PROMPT_STATUS_LABEL } from "@/lib/types";

/* ---------- Tooltip shorthand: wraps a single element ---------- */
export function Tip({ label, children }: { label: ReactNode; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/* ---------- status badges ---------- */
const PROMPT_STATUS_CLASS: Record<PromptStatus, string> = {
  pending:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700",
  ready:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
  in_progress:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  completed:
    "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
  blocked:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900",
};
const PROMPT_DOT: Record<PromptStatus, string> = {
  pending: "bg-slate-400",
  ready: "bg-indigo-500",
  in_progress: "bg-blue-500",
  sent: "bg-emerald-500",
  completed: "bg-slate-400",
  blocked: "bg-red-500",
};

export function PromptStatusBadge({
  status,
  waiting,
  className,
  testId,
}: {
  status: PromptStatus;
  /** dependency-blocked: shows a lock + "Blocked" regardless of the stored status */
  waiting?: boolean;
  className?: string;
  testId?: string;
}) {
  const s: PromptStatus = waiting ? "blocked" : status;
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-md border px-1.5 text-[11px] font-medium whitespace-nowrap",
        PROMPT_STATUS_CLASS[s],
        className,
      )}
    >
      {waiting ? <Lock className="size-3" /> : <span className={cn("size-1.5 rounded-full", PROMPT_DOT[s])} />}
      {waiting ? "Blocked" : PROMPT_STATUS_LABEL[status]}
    </span>
  );
}

const PROJECT_STATUS_CLASS: Record<ProjectStatus, string> = {
  active:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
  paused:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  archived:
    "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/70 dark:text-slate-400 dark:border-slate-700",
};

export function ProjectStatusBadge({ status, testId }: { status: ProjectStatus; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] font-medium",
        PROJECT_STATUS_CLASS[status],
      )}
    >
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}

/* ---------- project icon tile ---------- */
export function ProjectIcon({
  icon,
  color,
  size = "md",
}: {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = iconFor(icon);
  const hex = colorHex(color);
  const dims = { sm: "size-6 rounded-md", md: "size-8 rounded-lg", lg: "size-11 rounded-xl" }[size];
  const iconDims = { sm: "size-3.5", md: "size-4", lg: "size-5" }[size];
  return (
    <span
      className={cn("grid shrink-0 place-items-center border", dims)}
      style={{ backgroundColor: `${hex}14`, borderColor: `${hex}33`, color: hex }}
    >
      <Icon className={iconDims} />
    </span>
  );
}

/* ---------- progress bar ---------- */
export function ProgressBar({
  value,
  className,
  color,
  testId,
}: {
  value: number;
  className?: string;
  color?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ---------- empty state ---------- */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  testId,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border border-dashed bg-card/60 px-6 py-10 sm:items-center sm:text-center",
        className,
      )}
    >
      <div className="grid size-10 place-items-center rounded-lg border bg-background text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- page header with breadcrumbs ---------- */
export interface Crumb {
  label: string;
  to?: string;
}

export function PageHeader({
  title,
  subtitle,
  crumbs,
  actions,
  leading,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {crumbs && crumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="breadcrumbs">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="size-3 shrink-0 opacity-60" />}
              {c.to ? (
                <Link to={c.to} className="truncate transition-colors hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="truncate text-foreground/80">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {leading}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight" data-testid="page-title">
              {title}
            </h1>
            {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" data-testid="loading-state">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl border bg-card" />
      ))}
    </div>
  );
}
