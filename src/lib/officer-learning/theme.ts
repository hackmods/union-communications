/**
 * Officer Learning dark training shell tokens.
 *
 * Intentional exception to light GuideLayout — signals focus mode, not a
 * user-toggle theme. Colours align with platform orange (`opseu-blue`) on navy
 * instead of amber/teal gamification accents.
 */
export const olTheme = {
  shell: "min-h-screen bg-[#0B132B] text-white",
  eyebrow:
    "text-sm font-semibold uppercase tracking-[0.25em] text-orange-300/90",
  bodyMuted: "text-slate-300",
  bodySmall: "text-sm text-slate-400",
  link: "font-medium text-orange-200 underline underline-offset-2 hover:text-white",
  linkPlain: "text-orange-200 hover:text-white",
  surface: "rounded-xl border border-white/10 bg-white/5",
  surfaceHover:
    "border-white/10 bg-slate-950/40 hover:border-orange-400/30 hover:bg-slate-900/80",
  callout: "rounded-xl border border-orange-400/25 bg-orange-500/10 px-4 py-3",
  calloutTitle: "font-semibold text-orange-100",
  calloutBody: "mt-1 text-sm leading-relaxed text-slate-200/90",
  disclaimer: "text-sm text-slate-400",
  sectionLabel:
    "text-xs font-semibold uppercase tracking-[0.2em] text-slate-400",
  progressSummary: "text-sm text-slate-300",
  progressBar: "bg-opseu-blue",
  statusCompleted: "border-emerald-400 bg-emerald-500 text-slate-950",
  statusInProgress: "border-orange-300 bg-orange-500/90 text-slate-950",
  statusNotStarted: "border-white/30 bg-slate-900 text-slate-200",
  chipPrimary:
    "border border-orange-400/30 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20",
  chipSecondary:
    "border border-white/15 bg-white/5 text-slate-200 hover:border-orange-400/30",
} as const;
