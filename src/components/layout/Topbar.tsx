import { useState } from "react";
import { useMatch } from "react-router-dom";
import { FileText, Menu, Moon, Plus, Search, StickyNote, Sun, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSettings } from "@/lib/settings";
import { useDialogs } from "@/components/dialogs/DialogsProvider";
import { Kbd, Tip } from "@/components/common/ui";
import { SidebarContent } from "./Sidebar";

export default function Topbar() {
  const { resolvedTheme, toggleTheme } = useSettings();
  const { openProject, openPrompt, openNote, setSearchOpen } = useDialogs();
  const [mobileNav, setMobileNav] = useState(false);
  const match = useMatch("/projects/:projectId/*");
  const projectId = match?.params.projectId;
  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

  return (
    <header
      className="z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-md md:px-6"
      data-testid="app-topbar"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setMobileNav(true)}
        aria-label="Open navigation"
        data-testid="topbar-mobile-menu-button"
      >
        <Menu className="size-4" />
      </Button>
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0" data-testid="mobile-nav-sheet">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        data-testid="global-search-trigger"
        className="flex h-8 w-full max-w-md items-center gap-2 rounded-lg border bg-background px-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
      >
        <Search className="size-3.5" />
        <span className="flex-1 truncate">Search projects, prompts and notes…</span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" variant="outline" className="gap-1.5" data-testid="quick-create-button">
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => openProject()} data-testid="quick-create-project">
              <FolderPlus className="size-4" /> New project
            </DropdownMenuItem>
            {projectId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px]">In this project</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openPrompt({ projectId })} data-testid="quick-create-prompt">
                  <FileText className="size-4" /> New prompt
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openNote({ projectId })} data-testid="quick-create-note">
                  <StickyNote className="size-4" /> New note
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Tip label={resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            data-testid="theme-toggle"
          >
            {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </Tip>
      </div>
    </header>
  );
}
