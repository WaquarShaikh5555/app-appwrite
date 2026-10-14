import { ComponentType } from "react";
import {
  IconBell,
  IconBook,
  IconBolt,
  IconChart,
  IconCloud,
  IconShield,
  IconTarget,
  IconWallet,
} from "@/components/icons";

export type ToolStatus = "soon" | "planned";

export interface ToolEntry {
  id: string;
  name: string;
  description: string;
  status: ToolStatus;
  icon: ComponentType<{ size?: number; color?: string }>;
  /** Shown on the dashboard. */
  featured?: boolean;
}

/**
 * The roadmap. New tools are announced in Settings and appear in the Tools tab
 * as they ship — this list is the single source of truth for both screens.
 */
export const ROADMAP: ToolEntry[] = [
  {
    id: "tasks",
    name: "Task Tracker",
    description: "Plan the day, tick things off, keep the streak honest.",
    status: "soon",
    icon: IconTarget,
    featured: true,
  },
  {
    id: "notes",
    name: "Notes & Journal",
    description: "Capture thoughts and organise them by day.",
    status: "soon",
    icon: IconBook,
    featured: true,
  },
  {
    id: "expenses",
    name: "Expenses",
    description: "Track spending and keep monthly budgets in check.",
    status: "soon",
    icon: IconWallet,
    featured: true,
  },
  {
    id: "habits",
    name: "Habit Streaks",
    description: "Build routines that survive busy weeks.",
    status: "planned",
    icon: IconBolt,
  },
  {
    id: "reminders",
    name: "Reminders",
    description: "Notifications for the things worth remembering.",
    status: "planned",
    icon: IconBell,
  },
  {
    id: "insights",
    name: "Insights",
    description: "Charts across everything you track in Eternalz.",
    status: "planned",
    icon: IconChart,
  },
  {
    id: "vault",
    name: "File Vault",
    description: "Upload and share files, backed by Appwrite Storage.",
    status: "planned",
    icon: IconCloud,
  },
  {
    id: "spaces",
    name: "Shared Spaces",
    description: "Collaborate with Appwrite Teams when you need to.",
    status: "planned",
    icon: IconShield,
  },
];

export const statusLabel: Record<ToolStatus, string> = {
  soon: "Almost ready",
  planned: "Planned",
};

export const TOOLS_IN_WORK = ROADMAP.length;
