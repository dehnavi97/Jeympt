import {
  Bot,
  Boxes,
  BrainCircuit,
  Code2,
  FileText,
  FlaskConical,
  Folder,
  Layers,
  Lightbulb,
  Megaphone,
  Palette,
  Rocket,
  Sparkles,
  Target,
  Terminal,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const PROJECT_ICONS: Record<string, LucideIcon> = {
  folder: Folder,
  rocket: Rocket,
  code: Code2,
  bot: Bot,
  brain: BrainCircuit,
  sparkles: Sparkles,
  terminal: Terminal,
  layers: Layers,
  boxes: Boxes,
  flask: FlaskConical,
  lightbulb: Lightbulb,
  megaphone: Megaphone,
  palette: Palette,
  target: Target,
  file: FileText,
  wand: Wand2,
};

export const PROJECT_COLORS: Record<string, { label: string; hex: string }> = {
  indigo: { label: "Indigo", hex: "#6366F1" },
  violet: { label: "Violet", hex: "#8B5CF6" },
  sky: { label: "Sky", hex: "#0EA5E9" },
  teal: { label: "Teal", hex: "#14B8A6" },
  emerald: { label: "Emerald", hex: "#10B981" },
  amber: { label: "Amber", hex: "#F59E0B" },
  rose: { label: "Rose", hex: "#F43F5E" },
  slate: { label: "Slate", hex: "#64748B" },
};

export const colorHex = (key: string) => PROJECT_COLORS[key]?.hex ?? PROJECT_COLORS.indigo.hex;
export const iconFor = (key: string): LucideIcon => PROJECT_ICONS[key] ?? Folder;
