import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Database, HardDrive, LayoutGrid, List, Monitor, Moon, ShieldCheck, Sun, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { clearAllData } from "@/lib/ops";
import { fileSize } from "@/lib/format";
import { useSettings, type ProjectView, type ThemePref } from "@/lib/settings";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { PageHeader } from "@/components/common/ui";

export const APP_VERSION = "1.0.0";

function Row({ title, description, children, testId }: { title: string; description: string; children: ReactNode; testId: string }) {
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between" data-testid={testId}>
      <div>
        <div className="text-[13px] font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange, testId }: { value: T; options: { value: T; label: string; icon: LucideIcon }[]; onChange: (v: T) => void; testId: string }) {
  return (
    <div className="flex rounded-lg border bg-background p-0.5" data-testid={testId}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          data-testid={`${testId}-${o.value}`}
          data-active={value === o.value || undefined}
          className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground", value === o.value && "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border)]")}
        >
          <o.icon className="size-3.5" /> {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Settings() {
  const { settings, update } = useSettings();
  const confirm = useConfirm();
  const counts = useLiveQuery(async () => ({
    projects: await db.projects.count(),
    items: await db.items.count(),
    attachments: await db.attachments.count(),
    bytes: (await db.attachments.toArray()).reduce((s, a) => s + a.size, 0),
  }), []);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const e = await navigator.storage?.estimate?.();
        const persisted = (await navigator.storage?.persisted?.()) ?? false;
        if (e) setEstimate({ usage: e.usage ?? 0, quota: e.quota ?? 0, persisted });
      } catch {
        /* unsupported */
      }
    })();
  }, [counts]);

  const wipe = async () => {
    const ok = await confirm({
      title: "Delete all local data?",
      description: "Every project, prompt, note and attachment on this device will be permanently erased. This cannot be undone.",
      confirmLabel: "Delete everything",
      force: true,
    });
    if (!ok) return;
    await clearAllData();
    Object.keys(localStorage).filter((k) => k.startsWith("jeympt.draft.") || k.startsWith("jeympt.collapsed.")).forEach((k) => localStorage.removeItem(k));
    toast.success("All local data deleted");
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Preferences are saved on this device." />

      <section className="overflow-hidden rounded-xl border bg-card">
        <h2 className="border-b px-4 py-3 text-sm font-semibold">Appearance & behavior</h2>
        <Row title="Theme" description="Choose a light or dark interface, or follow your system." testId="settings-theme-row">
          <Segmented<ThemePref>
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            testId="settings-theme"
            options={[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ]}
          />
        </Row>
        <Row title="Default project view" description="How My Projects is displayed when you open it." testId="settings-view-row">
          <Segmented<ProjectView>
            value={settings.projectView}
            onChange={(projectView) => update({ projectView })}
            testId="settings-project-view"
            options={[
              { value: "grid", label: "Grid", icon: LayoutGrid },
              { value: "list", label: "List", icon: List },
            ]}
          />
        </Row>
        <Row title="Confirm destructive actions" description="Ask before deleting projects, prompts, notes and attachments." testId="settings-confirm-row">
          <Switch checked={settings.confirmDestructive} onCheckedChange={(v: boolean) => update({ confirmDestructive: v })} data-testid="settings-confirm-switch" />
        </Row>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card" data-testid="settings-data-section">
        <h2 className="border-b px-4 py-3 text-sm font-semibold">Local data</h2>
        <div className="grid gap-px bg-border sm:grid-cols-3">
          {[
            ["Projects", counts?.projects ?? 0],
            ["Prompts & notes", counts?.items ?? 0],
            ["Attachments", `${counts?.attachments ?? 0} · ${fileSize(counts?.bytes ?? 0)}`],
          ].map(([l, v]) => (
            <div key={l as string} className="bg-card px-4 py-3">
              <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{l}</div>
              <div className="mt-0.5 font-mono text-lg font-semibold" data-testid={`settings-count-${String(l).toLowerCase().replace(/[^a-z]+/g, "-")}`}>{v}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t px-4 py-4 text-xs text-muted-foreground">
          <p className="flex items-start gap-2"><Database className="mt-0.5 size-3.5 shrink-0" /> All data is stored in this device's IndexedDB database (“jeympt”). Nothing is uploaded — there is no account, cloud or AI service.</p>
          <p className="flex items-start gap-2"><HardDrive className="mt-0.5 size-3.5 shrink-0" />
            {estimate ? `Using ${fileSize(estimate.usage)} of ~${fileSize(estimate.quota)} available storage.` : "Storage usage estimate unavailable in this environment."}
          </p>
          <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            {estimate?.persisted ? "Persistent storage is granted — the browser will not evict your data." : "Storage is best-effort. In the desktop (Tauri) app data stays in the app's own profile."}
          </p>
        </div>
        <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[13px] font-medium text-destructive">Delete all data</div>
            <div className="text-xs text-muted-foreground">Permanently erase every project, prompt, note and attachment.</div>
          </div>
          <Button variant="destructive" onClick={() => void wipe()} data-testid="settings-clear-data-button">
            <Trash2 className="size-3.5" /> Delete all data
          </Button>
        </div>
      </section>

      <section className="flex items-center justify-between rounded-xl border bg-card px-4 py-3" data-testid="settings-about">
        <div>
          <div className="text-[13px] font-medium">Jeympt</div>
          <div className="text-xs text-muted-foreground">Organize. Execute. Keep Moving.</div>
        </div>
        <span className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs" data-testid="settings-app-version">v{APP_VERSION}</span>
      </section>
    </>
  );
}
