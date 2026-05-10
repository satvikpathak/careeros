/**
 * CareerOS monochrome design tokens (post-login surfaces only).
 *
 * Consumers: shadcn primitives (`button`, `card`, `badge`, ...), shared
 * primitives (`StatCard`, `SectionHeader`, ...), and authenticated pages.
 *
 * NEVER imported from `src/app/page.tsx` or the 3D cloud components — the
 * landing page keeps its glass / gradient look.
 */
export const tokens = {
  colors: {
    ink: "#0A0A0A",
    surface0: "#FFFFFF",
    surface1: "#FAFAFA",
    surface2: "#F5F5F5",
    border: "#E5E5E5",
    borderStrong: "#D4D4D4",
    textPrimary: "#0A0A0A",
    textSecondary: "#525252",
    textMuted: "#A3A3A3",
    success: "#16A34A",
    warning: "#CA8A04",
    danger: "#DC2626",
    info: "#525252",
  },
  radii: { sm: 8, md: 12, lg: 16 },
  shadows: {
    sm: "0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 3px 0 rgba(0,0,0,0.04)",
    md: "0 4px 12px -2px rgba(0,0,0,0.08)",
  },
} as const;

export type Tokens = typeof tokens;

/**
 * Tailwind-class shortcuts derived from tokens. Use these in className strings
 * so future token changes propagate automatically.
 */
export const t = {
  surface: "bg-white",
  surfaceMuted: "bg-neutral-50",
  surfaceHover: "hover:bg-neutral-50",
  border: "border border-neutral-200",
  borderStrong: "border border-neutral-300",
  text: "text-neutral-950",
  textSecondary: "text-neutral-600",
  textMuted: "text-neutral-400",
  card: "bg-white border border-neutral-200 rounded-xl shadow-sm",
  inkButton: "bg-neutral-950 text-white hover:bg-neutral-800",
  outlineButton: "border border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-50",
  ghostButton: "text-neutral-700 hover:bg-neutral-100",
} as const;
