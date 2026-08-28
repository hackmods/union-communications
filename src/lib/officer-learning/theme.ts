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
  calloutWarning:
    "rounded-xl border border-orange-400/30 bg-orange-500/10 p-4 text-orange-50",
  calloutPractice:
    "rounded-xl border border-sky-400/30 bg-sky-500/10 p-4 text-sky-50",
  calloutReflection:
    "rounded-xl border border-violet-400/30 bg-violet-500/10 p-4 text-violet-50",
  calloutDefault:
    "rounded-xl border border-orange-400/25 bg-orange-500/10 p-4 text-slate-100",
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
  panelQuiz:
    "scroll-mt-32 rounded-2xl border border-orange-400/20 bg-slate-900/70 p-6 shadow-xl transition-[transform,box-shadow] duration-300 md:p-8",
  diagramShell:
    "overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5",
  timelineShell:
    "mb-6 overflow-hidden rounded-xl border border-orange-400/20 bg-slate-950/60 p-4 md:p-5",
  scenarioShell:
    "scroll-mt-32 overflow-hidden rounded-2xl border-2 border-orange-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 p-6 shadow-lg md:p-8",
  btnPrimary:
    "inline-flex items-center justify-center rounded-xl bg-opseu-blue px-6 py-3 font-semibold text-white transition hover:bg-opseu-dark disabled:cursor-not-allowed disabled:opacity-50",
  btnPrimarySm:
    "inline-flex items-center justify-center rounded-xl bg-opseu-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-opseu-dark disabled:opacity-60",
  btnOutline:
    "inline-flex items-center justify-center rounded-xl border border-white/20 bg-transparent px-6 py-3 font-semibold text-slate-100 transition hover:border-orange-400/40 hover:bg-white/5",
  btnOutlineRetry:
    "inline-flex items-center justify-center rounded-xl border border-orange-400/40 bg-transparent px-6 py-3 font-semibold text-orange-100 transition hover:bg-orange-500/15 disabled:opacity-50",
  inputAccent: "accent-orange-500",
  optionSelected: "border-orange-400 bg-orange-500/15",
  optionHover: "border-white/10 bg-white/5 hover:border-orange-400/40",
  optionLabel: "mr-2 font-semibold text-orange-300",
  subsectionTitle: "text-xl font-semibold text-orange-200",
  codeBlock:
    "overflow-x-auto rounded-xl border border-orange-400/20 bg-slate-950/70 p-4 font-mono text-sm text-orange-100",
  checklistPanel: "rounded-xl border border-orange-400/20 bg-orange-500/5 p-4",
  checklistTitle: "text-sm font-semibold text-orange-100",
  checklistProgress: "text-xs text-slate-400",
  checklistItemOn: "border-orange-400/40 bg-orange-500/15",
  checklistItemOff: "border-white/10 bg-white/5 hover:border-orange-400/30",
  tableWrap: "overflow-x-auto rounded-xl border border-white/10",
  tableHead: "bg-orange-500/10 text-orange-100",
  stepBadge:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-opseu-blue text-xs font-bold text-white",
  ladderRung:
    "flex-1 rounded-xl border border-orange-400/30 bg-orange-500/10 px-3 py-3 text-center text-sm font-semibold text-orange-50",
  dontApplyBox:
    "rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-orange-50",
  syncPanel: "space-y-4 rounded-xl border border-orange-400/20 bg-orange-500/10 p-4",
  syncTitle: "font-semibold text-white",
  syncBody: "mt-1 text-sm text-slate-300",
  syncLabel: "text-sm text-slate-200",
  syncHint: "mt-1 block text-slate-400",
  certificatePanel:
    "space-y-3 rounded-xl border border-orange-400/25 bg-orange-500/10 p-4",
  certificateTitle: "font-semibold text-orange-100",
  certificateHint: "text-sm text-slate-200",
  certificateLabel: "block text-sm text-slate-300",
  hintPanel:
    "mb-6 rounded-lg border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-sm text-slate-200",
  retryPanel:
    "rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-orange-100",
  phaseLabel: "text-[10px] font-bold uppercase tracking-[0.22em] text-orange-400",
  phaseArrow: "hidden shrink-0 self-center text-lg text-orange-400/70 sm:inline",
} as const;
