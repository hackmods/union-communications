/**
 * Viewport Lab axe-core suite presets and result normalization.
 * Operator/Muse workbench only — does not change Playwright CI gates.
 */

export type AxeSuiteId =
  | "wcag22aa"
  | "wcag21aa"
  | "wcag2aa"
  | "best-practice"
  | "experimental"
  | "all";

export type AxeImpactFilter = "serious" | "all";

export type AxeFindingKind = "violation" | "incomplete";

export type AxeFinding = {
  id: string;
  impact: string | null | undefined;
  help: string;
  description: string;
  helpUrl: string;
  tags: string[];
  nodes: number;
  targets: string[];
  kind: AxeFindingKind;
};

export type AxeRunOptionsInput = {
  suite?: AxeSuiteId;
  colorContrast?: boolean;
  includeIncomplete?: boolean;
  impact?: AxeImpactFilter;
};

export type AxeSuitePreset = {
  id: AxeSuiteId;
  label: string;
  /** axe runOnly tags; omit for default enabled rule set */
  tags: readonly string[] | null;
};

export const DEFAULT_AXE_SUITE: AxeSuiteId = "wcag22aa";
export const DEFAULT_AXE_IMPACT: AxeImpactFilter = "all";
export const DEFAULT_AXE_INCLUDE_INCOMPLETE = true;
export const AXE_TARGET_PREVIEW_MAX = 3;

export const AXE_SUITE_PRESETS: readonly AxeSuitePreset[] = [
  {
    id: "wcag22aa",
    label: "WCAG 2.2 AA",
    tags: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
  },
  {
    id: "wcag21aa",
    label: "WCAG 2.1 AA",
    tags: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
  {
    id: "wcag2aa",
    label: "WCAG 2.0 AA",
    tags: ["wcag2a", "wcag2aa"],
  },
  {
    id: "best-practice",
    label: "Best practice",
    tags: ["best-practice"],
  },
  {
    id: "experimental",
    label: "Experimental",
    tags: ["experimental"],
  },
  {
    id: "all",
    label: "All enabled rules",
    tags: null,
  },
] as const;

export function axeSuiteById(id: string): AxeSuitePreset | undefined {
  return AXE_SUITE_PRESETS.find((p) => p.id === id);
}

export function resolveAxeSuiteId(raw: string | undefined): AxeSuiteId {
  return axeSuiteById(raw ?? "")?.id ?? DEFAULT_AXE_SUITE;
}

export function resolveAxeImpactFilter(
  raw: string | undefined,
): AxeImpactFilter {
  return raw === "serious" ? "serious" : DEFAULT_AXE_IMPACT;
}

/** Minimal structural shape of axe Result / AxeResults for normalization. */
export type AxeRawNode = {
  target?: unknown;
};

export type AxeRawRuleResult = {
  id: string;
  impact?: string | null;
  help: string;
  description?: string;
  helpUrl?: string;
  tags?: string[];
  nodes: AxeRawNode[];
};

export type AxeRawResults = {
  violations?: AxeRawRuleResult[];
  incomplete?: AxeRawRuleResult[];
  testEngine?: { name?: string; version?: string };
};

export type AxeRunOptionsBuilt = {
  runOnly?: { type: "tag"; values: string[] };
  rules?: { "color-contrast": { enabled: boolean } };
  resultTypes: Array<"violations" | "incomplete">;
  iframes: boolean;
  selectors: boolean;
  ancestry: boolean;
};

export function buildAxeRunOptions(input: AxeRunOptionsInput = {}): AxeRunOptionsBuilt {
  const suiteId = resolveAxeSuiteId(input.suite);
  const preset = axeSuiteById(suiteId)!;
  const includeIncomplete =
    input.includeIncomplete ?? DEFAULT_AXE_INCLUDE_INCOMPLETE;
  const colorContrast = Boolean(input.colorContrast);

  const resultTypes: Array<"violations" | "incomplete"> = ["violations"];
  if (includeIncomplete) resultTypes.push("incomplete");

  const options: AxeRunOptionsBuilt = {
    resultTypes,
    iframes: true,
    selectors: true,
    ancestry: true,
  };

  if (preset.tags) {
    options.runOnly = { type: "tag", values: [...preset.tags] };
  }

  if (!colorContrast) {
    options.rules = { "color-contrast": { enabled: false } };
  }

  return options;
}

const IMPACT_RANK: Record<string, number> = {
  minor: 1,
  moderate: 2,
  serious: 3,
  critical: 4,
};

function passesImpactFilter(
  impact: string | null | undefined,
  filter: AxeImpactFilter,
): boolean {
  if (filter === "all") return true;
  const rank = IMPACT_RANK[impact ?? ""] ?? 0;
  return rank >= IMPACT_RANK.serious;
}

function flattenTarget(target: unknown): string | null {
  if (typeof target === "string" && target.trim()) return target;
  if (!Array.isArray(target) || target.length === 0) return null;
  const parts = target.map((part) => {
    if (typeof part === "string") return part;
    if (Array.isArray(part)) return part.filter((p) => typeof p === "string").join(" ");
    return "";
  });
  const joined = parts.filter(Boolean).join(" › ");
  return joined || null;
}

function nodeTargets(nodes: AxeRawNode[], max = AXE_TARGET_PREVIEW_MAX): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    const flat = flattenTarget(node.target);
    if (flat) out.push(flat);
    if (out.length >= max) break;
  }
  return out;
}

function mapRuleResult(
  rule: AxeRawRuleResult,
  kind: AxeFindingKind,
): AxeFinding {
  return {
    id: rule.id,
    impact: rule.impact ?? null,
    help: rule.help,
    description: rule.description ?? "",
    helpUrl: rule.helpUrl ?? "",
    tags: Array.isArray(rule.tags) ? [...rule.tags] : [],
    nodes: rule.nodes?.length ?? 0,
    targets: nodeTargets(rule.nodes ?? []),
    kind,
  };
}

export type NormalizedAxeResults = {
  findings: AxeFinding[];
  violations: AxeFinding[];
  incomplete: AxeFinding[];
  axeVersion: string | null;
};

export function normalizeAxeResults(
  raw: AxeRawResults | null | undefined,
  opts: { impact?: AxeImpactFilter } = {},
): NormalizedAxeResults {
  const impact = resolveAxeImpactFilter(opts.impact);
  const violations = (raw?.violations ?? [])
    .map((r) => mapRuleResult(r, "violation"))
    .filter((f) => passesImpactFilter(f.impact, impact));
  const incomplete = (raw?.incomplete ?? [])
    .map((r) => mapRuleResult(r, "incomplete"))
    .filter((f) => passesImpactFilter(f.impact, impact));
  return {
    findings: [...violations, ...incomplete],
    violations,
    incomplete,
    axeVersion: raw?.testEngine?.version ?? null,
  };
}

export type AxeRunResult =
  | {
      ok: true;
      findings: AxeFinding[];
      violations: AxeFinding[];
      incomplete: AxeFinding[];
      suite: AxeSuiteId;
      impact: AxeImpactFilter;
      includeIncomplete: boolean;
      colorContrast: boolean;
      axeVersion: string | null;
    }
  | { ok: false; error: string };

export function summarizeAxeFindings(findings: AxeFinding[]): {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  incomplete: number;
  violations: number;
} {
  const counts = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    incomplete: 0,
    violations: 0,
  };
  for (const f of findings) {
    if (f.kind === "incomplete") counts.incomplete += 1;
    else counts.violations += 1;
    if (f.impact === "critical") counts.critical += 1;
    else if (f.impact === "serious") counts.serious += 1;
    else if (f.impact === "moderate") counts.moderate += 1;
    else if (f.impact === "minor") counts.minor += 1;
  }
  return counts;
}
