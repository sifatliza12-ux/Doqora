/**
 * Doqora Design System v2.0 — token values as plain JS/TS.
 *
 * This file MUST be kept in sync manually with the CSS custom properties
 * defined in `src/app/globals.css` (@theme block). Tailwind v4 has no
 * built-in mechanism to generate one from the other.
 *
 * Why this file exists: Clerk's `appearance.variables` API (see
 * clerk-appearance.ts) takes plain JS values, not Tailwind classes or CSS
 * custom properties, so Clerk-rendered components (SignIn, SignUp, etc.)
 * can be themed to match the app.
 */

export const colors = {
  background: "#0B1220",
  sidebar: "#111827",
  surface: "#172033",
  border: "#1E293B",
  foreground: "#F1F5F9",
  mutedForeground: "#94A3B8",
  emerald: "#10B981",
  // Text/icon color on top of a solid emerald fill (e.g. primary buttons)
  emeraldForeground: "#FFFFFF",
  copper: "#C58B3A",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  // Text/icon color on top of a solid danger fill (e.g. destructive buttons)
  dangerForeground: "#FFFFFF",
  sheet: {
    background: "#FFFFFF",
    // Primary/body invoice text
    foreground: "#000000",
    // Invoice headings/emphasis
    heading: "#0F172A",
    mutedForeground: "#64748B",
    border: "#E2E8F0",
    copper: "#C58B3A",
  },
} as const;

export const radius = {
  input: 8,
  button: 8,
  table: 12,
  card: 12,
  modal: 16,
  sheet: 0,
} as const;

export const badgeColors = {
  draft: { background: "#F1F5F9", foreground: "#475569" },
  sent: { background: "#DBEAFE", foreground: "#1E40AF" },
  paid: { background: "#DCFCE7", foreground: "#166534" },
  overdue: { background: "#FEF3C7", foreground: "#92400E" },
  cancelled: { background: "#FEE2E2", foreground: "#991B1B" },
} as const;
