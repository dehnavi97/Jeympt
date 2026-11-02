import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import CommandPalette from "@/components/search/CommandPalette";

export default function AppShell() {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground" data-testid="app-shell">
      <Sidebar />
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto" id="main-scroll">
          <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
