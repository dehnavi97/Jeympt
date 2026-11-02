import { NavLink } from "react-router-dom";
import {
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Paperclip,
  Plus,
  Settings,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDialogs } from "@/components/dialogs/DialogsProvider";
import { useProjects } from "@/lib/hooks";
import { ProjectIcon } from "@/components/common/ui";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, id: "dashboard", end: true },
  { to: "/projects", label: "My Projects", icon: FolderKanban, id: "projects", end: false },
  { to: "/prompts", label: "All Prompts", icon: MessageSquareText, id: "prompts", end: false },
  { to: "/favorites", label: "Favorites", icon: Star, id: "favorites", end: false },
  { to: "/attachments", label: "Attachments", icon: Paperclip, id: "attachments", end: false },
  { to: "/settings", label: "Settings", icon: Settings, id: "settings", end: false },
];

export function Logo() {
  return (
    <div className="flex items-center gap-2.5" data-testid="app-logo">
      <div className="relative grid size-8 place-items-center rounded-lg bg-[#4F46E5] text-white shadow-[0_1px_2px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]">
        <img src="/apple-touch-icon.png" alt="Jeympt" />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight">Jeympt</div>
        <div className="text-[10px] text-muted-foreground">Organize. Execute. Keep Moving.</div>
      </div>
    </div>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { openProject } = useDialogs();
  const projects = useProjects();
  const pinned = (projects ?? [])
    .filter((p) => p.favorite && p.status !== "archived")
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-3">
        <Logo />
      </div>
      <div className="px-3 pb-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => {
            onNavigate?.();
            openProject();
          }}
          data-testid="sidebar-new-project-button"
        >
          <Plus className="size-4" /> New Project
        </Button>
      </div>
      <nav className="space-y-0.5 px-3" data-testid="sidebar-nav">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            data-testid={`sidebar-nav-${n.id}`}
            className={({ isActive }) =>
              cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.04]",
                isActive &&
                  "bg-sidebar-accent text-sidebar-accent-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] hover:bg-sidebar-accent dark:ring-white/[0.04]",
              )
            }
          >
            <n.icon className="size-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      {pinned.length > 0 && (
        <div className="mt-6 px-3">
          <div className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Favorite projects
          </div>
          <div className="space-y-0.5">
            {pinned.map((p) => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}`}
                onClick={onNavigate}
                data-testid={`sidebar-favorite-project-${p.id}`}
                className={({ isActive }) =>
                  cn(
                    "flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.04]",
                    isActive && "text-foreground",
                  )
                }
              >
                <ProjectIcon icon={p.icon} color={p.color} size="sm" />
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto px-4 py-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Stored locally on this device
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside
      className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar select-none lg:block"
      data-testid="app-sidebar"
    >
      <SidebarContent />
    </aside>
  );
}
