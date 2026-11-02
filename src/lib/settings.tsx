import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ThemePref = "light" | "dark" | "system";
export type ProjectView = "grid" | "list";

export interface Settings {
  theme: ThemePref;
  projectView: ProjectView;
  confirmDestructive: boolean;
}

const KEY = "jeympt.settings.v1";
const DEFAULTS: Settings = { theme: "light", projectView: "grid", confirmDestructive: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  resolvedTheme: "light" | "dark";
  toggleTheme: () => void;
}

const SettingsContext = createContext<Ctx | null>(null);

const systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const fn = () => setSysDark(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const resolvedTheme: "light" | "dark" =
    settings.theme === "system" ? (sysDark ? "dark" : "light") : settings.theme;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleTheme = useCallback(
    () => update({ theme: resolvedTheme === "dark" ? "light" : "dark" }),
    [resolvedTheme, update],
  );

  const value = useMemo(
    () => ({ settings, update, resolvedTheme, toggleTheme }),
    [settings, update, resolvedTheme, toggleTheme],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
