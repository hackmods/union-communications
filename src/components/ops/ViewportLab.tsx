"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import {
  type AxeFinding,
  type AxeImpactFilter,
  type AxeRunOptionsInput,
  type AxeRunResult,
  type AxeSuiteId,
  type OverflowResult,
  type ViewportLabLocale,
  buildViewportLabFrameSrc,
  buildViewportLabSearchParams,
  ensureTrailingSlashPath,
  measureDocumentOverflow,
  parseViewportLabSearchParams,
  sanitizeViewportFramePath,
  swapLocaleInPath,
} from "@/lib/ops/viewport-lab-api";
import {
  AXE_SUITE_PRESETS,
  DEFAULT_AXE_IMPACT,
  DEFAULT_AXE_INCLUDE_INCOMPLETE,
  DEFAULT_AXE_SUITE,
  buildAxeRunOptions,
  normalizeAxeResults,
  resolveAxeImpactFilter,
  resolveAxeSuiteId,
  summarizeAxeFindings,
} from "@/lib/ops/viewport-lab-axe";
import {
  VIEWPORT_AUDIT_SIZES,
  VIEWPORT_LAB_API_VERSION,
  VIEWPORT_LAB_CAPABILITIES_V2,
  VIEWPORT_PATH_HISTORY_KEY,
  VIEWPORT_PATH_HISTORY_MAX,
  VIEWPORT_PRESETS,
  matchAuditSize,
  matchPreset,
  presetById,
  type ViewportPresetId,
} from "@/lib/ops/viewport-presets";
import { LabsNav } from "@/components/ops/LabsNav";

export type ViewportLabApi = {
  version: typeof VIEWPORT_LAB_API_VERSION;
  capabilities: readonly string[];
  setViewport: (width: number, height?: number) => void;
  setViewportPreset: (id: ViewportPresetId) => void;
  getViewport: () => {
    width: number;
    height: number;
    preset: ViewportPresetId | null;
  };
  navigateFrame: (path: string) => void;
  flipOrientation: () => void;
  setLocale: (locale: ViewportLabLocale) => void;
  getFramePath: () => string | null;
  checkOverflow: () => OverflowResult;
  runAxe: (options?: AxeRunOptionsInput) => Promise<AxeRunResult>;
  setCompareMode: (enabled: boolean) => void;
  setViewportPane: (pane: "a" | "b", width: number, height?: number) => void;
};

declare global {
  interface Window {
    __unionopsViewportLab?: ViewportLabApi;
    setViewport?: (width: number, height?: number) => void;
    setViewportPreset?: (id: ViewportPresetId) => void;
  }
}

type PaneState = {
  width: number;
  height: number;
  path: string;
};

function clampDim(n: number): number {
  if (!Number.isFinite(n)) return 375;
  return Math.min(4000, Math.max(200, Math.round(n)));
}

function readLabBootstrap() {
  if (typeof window === "undefined") {
    return {
      width: 1280,
      height: 800,
      path: "/en/",
      locale: "en" as const,
      compare: false,
    };
  }
  return parseViewportLabSearchParams(
    new URLSearchParams(window.location.search),
  );
}

function readPathHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(VIEWPORT_PATH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is string => typeof p === "string" && p.startsWith("/"))
      .slice(0, VIEWPORT_PATH_HISTORY_MAX);
  } catch {
    return [];
  }
}

function pushPathHistory(path: string): string[] {
  const next = [path, ...readPathHistory().filter((p) => p !== path)].slice(
    0,
    VIEWPORT_PATH_HISTORY_MAX,
  );
  try {
    window.sessionStorage.setItem(
      VIEWPORT_PATH_HISTORY_KEY,
      JSON.stringify(next),
    );
  } catch {
    // private browsing / quota
  }
  return next;
}

async function waitForFrameDocument(
  frame: HTMLIFrameElement,
): Promise<Document | null> {
  const existing = frame.contentDocument;
  // interactive is enough — Next can linger before complete while streaming.
  if (existing && existing.readyState !== "loading") return existing;
  await new Promise<void>((resolve) => {
    const onLoad = () => resolve();
    frame.addEventListener("load", onLoad, { once: true });
    const doc = frame.contentDocument;
    if (doc && doc.readyState !== "loading") {
      frame.removeEventListener("load", onLoad);
      resolve();
    }
  });
  return frame.contentDocument;
}

/**
 * Pass the iframe element (parent-realm Node), never contentDocument.
 * Iframe documents fail `instanceof window.Node` in the parent, so axe
 * mis-parses args and throws "axe.run arguments are invalid".
 */
async function runAxeInFrame(
  frame: HTMLIFrameElement | null,
  input: AxeRunOptionsInput,
): Promise<AxeRunResult> {
  const suite = resolveAxeSuiteId(input.suite);
  const impact = resolveAxeImpactFilter(input.impact);
  const includeIncomplete =
    input.includeIncomplete ?? DEFAULT_AXE_INCLUDE_INCOMPLETE;
  const colorContrast = Boolean(input.colorContrast);

  try {
    if (!frame) return { ok: false, error: "frame_unavailable" };
    const doc = await waitForFrameDocument(frame);
    if (!doc?.defaultView) return { ok: false, error: "frame_unavailable" };

    const axeCore = await import("axe-core");
    const options = buildAxeRunOptions({
      suite,
      colorContrast,
      includeIncomplete,
    });
    const results = await axeCore.default.run(frame, options);
    const normalized = normalizeAxeResults(results, { impact });
    return {
      ok: true,
      findings: normalized.findings,
      violations: normalized.violations,
      incomplete: normalized.incomplete,
      suite,
      impact,
      includeIncomplete,
      colorContrast,
      axeVersion: normalized.axeVersion ?? axeCore.default.version ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "axe_failed",
    };
  }
}

export function ViewportLab() {
  const [boot] = useState(readLabBootstrap);
  const [width, setWidth] = useState(boot.width);
  const [height, setHeight] = useState(boot.height);
  const [path, setPath] = useState(boot.path);
  const [pathDraft, setPathDraft] = useState(boot.path);
  const [pathHistory, setPathHistory] = useState<string[]>(() => readPathHistory());
  const [locale, setLocaleState] = useState<ViewportLabLocale>(boot.locale);
  const [customW, setCustomW] = useState(String(boot.width));
  const [customH, setCustomH] = useState(String(boot.height));
  const [compare, setCompare] = useState(Boolean(boot.compare));
  const [paneB, setPaneB] = useState<PaneState>(() => ({
    width: 375,
    height: 812,
    path: boot.path,
  }));
  const [overflowNote, setOverflowNote] = useState<string | null>(null);
  const [overflowPx, setOverflowPx] = useState<number | null>(null);
  const [axeFindings, setAxeFindings] = useState<AxeFinding[] | null>(null);
  const [axeReportMeta, setAxeReportMeta] = useState<{
    suite: AxeSuiteId;
    impact: AxeImpactFilter;
    includeIncomplete: boolean;
    colorContrast: boolean;
    axeVersion: string | null;
  } | null>(null);
  const [axeError, setAxeError] = useState<string | null>(null);
  const [axeBusy, setAxeBusy] = useState(false);
  const [includeContrast, setIncludeContrast] = useState(false);
  const [axeSuite, setAxeSuite] = useState<AxeSuiteId>(DEFAULT_AXE_SUITE);
  const [axeImpact, setAxeImpact] =
    useState<AxeImpactFilter>(DEFAULT_AXE_IMPACT);
  const [includeIncomplete, setIncludeIncomplete] = useState(
    DEFAULT_AXE_INCLUDE_INCOMPLETE,
  );
  const [axeCopyNote, setAxeCopyNote] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ w: 1200, h: 800 });

  const frameARef = useRef<HTMLIFrameElement>(null);
  const frameBRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const overflowTimerRef = useRef<number | null>(null);
  const checkOverflowRef = useRef<() => OverflowResult>(() => ({
    error: "frame_unavailable",
  }));

  useEffect(() => {
    const qs = buildViewportLabSearchParams({
      width,
      height,
      path,
      locale,
      compare,
    });
    window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
  }, [width, height, path, locale, compare]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setStageSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const applyOverflowResult = useCallback((result: OverflowResult) => {
    if ("error" in result) {
      setOverflowPx(null);
      setOverflowNote(`Overflow: ${result.error}`);
      return;
    }
    setOverflowPx(result.horizontalPx);
    setOverflowNote(`Horizontal overflow: ${result.horizontalPx}px`);
  }, []);

  const checkOverflow = useCallback((): OverflowResult => {
    const doc = frameARef.current?.contentDocument ?? null;
    const result = doc
      ? measureDocumentOverflow(doc)
      : { error: "frame_unavailable" };
    applyOverflowResult(result);
    return result;
  }, [applyOverflowResult]);

  useEffect(() => {
    checkOverflowRef.current = checkOverflow;
  }, [checkOverflow]);

  /** Debounce past frame chrome transition (300ms) + layout settle. */
  const scheduleOverflowCheck = useCallback((delayMs = 350) => {
    if (overflowTimerRef.current != null) {
      window.clearTimeout(overflowTimerRef.current);
    }
    overflowTimerRef.current = window.setTimeout(() => {
      overflowTimerRef.current = null;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          checkOverflowRef.current();
        });
      });
    }, delayMs);
  }, []);

  useEffect(() => {
    return () => {
      if (overflowTimerRef.current != null) {
        window.clearTimeout(overflowTimerRef.current);
      }
    };
  }, []);

  const applyViewport = useCallback(
    (w: number, h: number) => {
      const nextW = clampDim(w);
      const nextH = clampDim(h);
      setWidth(nextW);
      setHeight(nextH);
      setCustomW(String(nextW));
      setCustomH(String(nextH));
      scheduleOverflowCheck(350);
    },
    [scheduleOverflowCheck],
  );

  const rememberPath = useCallback((next: string) => {
    setPathHistory(pushPathHistory(next));
  }, []);

  const navigateFrame = useCallback(
    (raw: string) => {
      const sanitized = sanitizeViewportFramePath(raw);
      if (!sanitized) {
        setOverflowPx(null);
        setOverflowNote("Path blocked (Hub/Portal/lab) or invalid.");
        return;
      }
      const next = ensureTrailingSlashPath(sanitized);
      setPath(next);
      setPathDraft(next);
      setPaneB((prev) => ({ ...prev, path: next }));
      rememberPath(next);
      setOverflowNote(null);
      setOverflowPx(null);
    },
    [rememberPath],
  );

  const flipOrientation = useCallback(() => {
    applyViewport(height, width);
  }, [applyViewport, height, width]);

  const setLocale = useCallback(
    (next: ViewportLabLocale) => {
      setLocaleState(next);
      const swapped = swapLocaleInPath(path, next);
      setPath(swapped);
      setPathDraft(swapped);
      setPaneB((prev) => ({
        ...prev,
        path: swapLocaleInPath(prev.path, next),
      }));
      rememberPath(swapped);
    },
    [path, rememberPath],
  );

  const syncPathFromFrame = useCallback(() => {
    try {
      const live = frameARef.current?.contentWindow?.location.pathname;
      if (!live) return;
      const sanitized = sanitizeViewportFramePath(live);
      if (!sanitized) return;
      const next = ensureTrailingSlashPath(sanitized);
      setPath((prev) => (prev === next ? prev : next));
      setPathDraft((prev) => (prev === next ? prev : next));
      setPaneB((prev) => (prev.path === next ? prev : { ...prev, path: next }));
      rememberPath(next);
    } catch {
      // cross-origin — ignore
    }
  }, [rememberPath]);

  const onFrameALoad = useCallback(() => {
    syncPathFromFrame();
    scheduleOverflowCheck(200);
  }, [scheduleOverflowCheck, syncPathFromFrame]);

  const runAxe = useCallback(
    async (options?: AxeRunOptionsInput): Promise<AxeRunResult> => {
      setAxeBusy(true);
      setAxeError(null);
      setAxeCopyNote(null);
      const input: AxeRunOptionsInput = {
        suite: options?.suite ?? axeSuite,
        impact: options?.impact ?? axeImpact,
        includeIncomplete: options?.includeIncomplete ?? includeIncomplete,
        colorContrast: options?.colorContrast ?? includeContrast,
      };
      const result = await runAxeInFrame(frameARef.current, input);
      setAxeBusy(false);
      if (!result.ok) {
        setAxeFindings(null);
        setAxeReportMeta(null);
        setAxeError(result.error);
        return result;
      }
      setAxeFindings(result.findings);
      setAxeReportMeta({
        suite: result.suite,
        impact: result.impact,
        includeIncomplete: result.includeIncomplete,
        colorContrast: result.colorContrast,
        axeVersion: result.axeVersion,
      });
      return result;
    },
    [axeSuite, axeImpact, includeIncomplete, includeContrast],
  );

  const buildAxeReportPayload = useCallback(() => {
    if (!axeFindings || !axeReportMeta) return null;
    return {
      timestamp: new Date().toISOString(),
      path,
      viewport: { width, height },
      suite: axeReportMeta.suite,
      impact: axeReportMeta.impact,
      includeIncomplete: axeReportMeta.includeIncomplete,
      colorContrast: axeReportMeta.colorContrast,
      axeVersion: axeReportMeta.axeVersion,
      summary: summarizeAxeFindings(axeFindings),
      findings: axeFindings,
    };
  }, [axeFindings, axeReportMeta, path, width, height]);

  const copyAxeJson = useCallback(async () => {
    const payload = buildAxeReportPayload();
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setAxeCopyNote("Copied JSON report.");
    } catch {
      setAxeCopyNote("Copy failed — use Download instead.");
    }
  }, [buildAxeReportPayload]);

  const downloadAxeJson = useCallback(() => {
    const payload = buildAxeReportPayload();
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viewport-lab-axe-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setAxeCopyNote("Downloaded JSON report.");
  }, [buildAxeReportPayload]);

  useEffect(() => {
    const api: ViewportLabApi = {
      version: VIEWPORT_LAB_API_VERSION,
      capabilities: [...VIEWPORT_LAB_CAPABILITIES_V2],
      setViewport: (w, h) => applyViewport(w, h ?? height),
      setViewportPreset: (id) => {
        const preset = presetById(id);
        if (preset) applyViewport(preset.width, preset.height);
      },
      getViewport: () => ({
        width,
        height,
        preset: matchPreset(width, height),
      }),
      navigateFrame,
      flipOrientation,
      setLocale,
      getFramePath: () => {
        try {
          return frameARef.current?.contentWindow?.location.pathname ?? path;
        } catch {
          return path;
        }
      },
      checkOverflow,
      runAxe,
      setCompareMode: (enabled) => setCompare(enabled),
      setViewportPane: (pane, w, h) => {
        if (pane === "a") applyViewport(w, h ?? height);
        else {
          setPaneB((prev) => ({
            ...prev,
            width: clampDim(w),
            height: clampDim(h ?? prev.height),
          }));
        }
      },
    };
    window.__unionopsViewportLab = api;
    window.setViewport = api.setViewport;
    window.setViewportPreset = api.setViewportPreset;
    return () => {
      delete window.__unionopsViewportLab;
      delete window.setViewport;
      delete window.setViewportPreset;
    };
  }, [
    width,
    height,
    path,
    applyViewport,
    navigateFrame,
    flipOrientation,
    setLocale,
    checkOverflow,
    runAxe,
  ]);

  const scaleFor = (w: number, h: number) => {
    const pad = 24;
    const availW = Math.max(120, stageSize.w - pad);
    const availH = Math.max(120, stageSize.h - pad);
    return Math.min(1, availW / w, availH / h);
  };

  const scaleA = scaleFor(width, height);
  const scaleB = scaleFor(paneB.width, paneB.height);
  const activePreset = matchPreset(width, height);
  const activeAudit = matchAuditSize(width, height);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-3 pt-2">
        <LabsNav active="viewport" />
      </div>
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-2 text-sm font-semibold tracking-wide text-zinc-200">
            Viewport Lab
          </h1>
          {VIEWPORT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              data-viewport-preset={preset.id}
              data-testid={`viewport-preset-${preset.id}`}
              onClick={() => applyViewport(preset.width, preset.height)}
              className={`min-h-11 rounded-md px-3 py-2 text-sm font-medium transition ${
                activePreset === preset.id
                  ? "bg-sky-600 text-white"
                  : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            data-testid="viewport-flip-orientation"
            onClick={flipOrientation}
            className="min-h-11 rounded-md bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
          >
            Flip orientation
          </button>
          <button
            type="button"
            data-testid="viewport-locale-en"
            onClick={() => setLocale("en")}
            className={`min-h-11 rounded-md px-3 py-2 text-sm ${
              locale === "en" ? "bg-sky-600" : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            data-testid="viewport-locale-fr"
            onClick={() => setLocale("fr")}
            className={`min-h-11 rounded-md px-3 py-2 text-sm ${
              locale === "fr" ? "bg-sky-600" : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            FR
          </button>
          <button
            type="button"
            data-testid="viewport-compare-toggle"
            onClick={() => setCompare((v) => !v)}
            className={`min-h-11 rounded-md px-3 py-2 text-sm ${
              compare ? "bg-sky-600" : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            Compare
          </button>
          <button
            type="button"
            data-testid="viewport-check-overflow"
            onClick={() => checkOverflow()}
            className="min-h-11 rounded-md bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
          >
            Check overflow
          </button>
          <label className="flex min-h-11 items-center gap-2 text-xs text-zinc-400">
            Suite
            <select
              data-testid="viewport-axe-suite"
              value={axeSuite}
              onChange={(e) =>
                setAxeSuite(resolveAxeSuiteId(e.target.value))
              }
              className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
            >
              {AXE_SUITE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-xs text-zinc-400">
            Impact
            <select
              data-testid="viewport-axe-impact"
              value={axeImpact}
              onChange={(e) =>
                setAxeImpact(resolveAxeImpactFilter(e.target.value))
              }
              className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
            >
              <option value="all">All</option>
              <option value="serious">Serious+critical</option>
            </select>
          </label>
          <button
            type="button"
            data-testid="viewport-run-axe"
            disabled={axeBusy}
            onClick={() => void runAxe()}
            className="min-h-11 rounded-md bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 disabled:opacity-50"
          >
            {axeBusy ? "Running axe…" : "Run axe"}
          </button>
          <label className="flex min-h-11 items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={includeContrast}
              onChange={(e) => setIncludeContrast(e.target.checked)}
              className="size-4"
            />
            axe color-contrast
          </label>
          <label className="flex min-h-11 items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              data-testid="viewport-axe-incomplete"
              checked={includeIncomplete}
              onChange={(e) => setIncludeIncomplete(e.target.checked)}
              className="size-4"
            />
            include incomplete
          </label>
          <span
            data-testid="viewport-overflow-badge"
            className={`inline-flex min-h-11 items-center rounded-md px-3 py-2 text-xs font-medium tabular-nums ${
              overflowPx == null
                ? "bg-zinc-800 text-zinc-400"
                : overflowPx === 0
                  ? "bg-emerald-900/60 text-emerald-300"
                  : "bg-amber-900/60 text-amber-200"
            }`}
          >
            {overflowPx == null
              ? "Overflow: —"
              : `Overflow: ${overflowPx}px`}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Audit sizes
          </span>
          {VIEWPORT_AUDIT_SIZES.map((size) => (
            <button
              key={size.id}
              type="button"
              data-viewport-audit={size.id}
              data-testid={`viewport-audit-${size.id}`}
              onClick={() => applyViewport(size.width, size.height)}
              className={`min-h-11 rounded-md px-3 py-2 text-sm font-medium transition ${
                activeAudit === size.id
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-end gap-2">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              applyViewport(Number(customW), Number(customH));
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="text-xs text-zinc-400">
              Width
              <input
                data-testid="viewport-custom-width"
                type="number"
                min={200}
                max={4000}
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                className="mt-1 block w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
              />
            </label>
            <label className="text-xs text-zinc-400">
              Height
              <input
                data-testid="viewport-custom-height"
                type="number"
                min={200}
                max={4000}
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                className="mt-1 block w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
              />
            </label>
            <button
              type="submit"
              data-testid="viewport-apply-size"
              className="min-h-11 rounded-md bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
            >
              Apply size
            </button>
          </form>

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              navigateFrame(pathDraft);
            }}
            className="flex min-w-[16rem] flex-1 flex-wrap items-end gap-2"
          >
            <label className="min-w-[12rem] flex-1 text-xs text-zinc-400">
              Path (same-origin public)
              <input
                data-testid="viewport-path-input"
                type="text"
                list="viewport-path-history"
                value={pathDraft}
                onChange={(e) => setPathDraft(e.target.value)}
                className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-sm text-zinc-100"
              />
              <datalist id="viewport-path-history">
                {pathHistory.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
            </label>
            <button
              type="submit"
              data-testid="viewport-path-go"
              className="min-h-11 rounded-md bg-sky-700 px-3 py-2 text-sm font-medium hover:bg-sky-600"
            >
              Go
            </button>
          </form>
        </div>

        <p className="mt-2 text-xs text-zinc-500">
          How to use with Muse: see repo guide{" "}
          <code className="text-zinc-300">docs/guides/VIEWPORT_LAB.md</code>
          {" · "}
          API:{" "}
          <code className="text-zinc-300">window.__unionopsViewportLab</code>
          {" · "}
          Linked from <code className="text-zinc-300">/build</code>
          {" · "}
          {width}×{height}
          {activePreset ? ` (${activePreset})` : ""}
          {activeAudit ? ` (${activeAudit})` : ""}
          {scaleA < 1 ? ` · scaled ${(scaleA * 100).toFixed(0)}%` : ""}
          {overflowNote ? ` · ${overflowNote}` : ""}
        </p>
      </header>

      {(axeFindings || axeError) && (
        <div
          data-testid="viewport-lab-axe-results"
          className="max-h-64 shrink-0 overflow-auto border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-xs"
        >
          {axeError && <p className="text-red-400">Axe error: {axeError}</p>}
          {axeFindings && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {(() => {
                const summary = summarizeAxeFindings(axeFindings);
                return (
                  <p className="text-zinc-300">
                    {axeReportMeta
                      ? `${axeReportMeta.suite} · impact ${axeReportMeta.impact}`
                      : "axe"}
                    {axeReportMeta?.axeVersion
                      ? ` · axe ${axeReportMeta.axeVersion}`
                      : ""}
                    {" · "}
                    {summary.violations} violation
                    {summary.violations === 1 ? "" : "s"}
                    {", "}
                    {summary.incomplete} incomplete
                    {" · "}
                    critical {summary.critical}, serious {summary.serious},
                    moderate {summary.moderate}, minor {summary.minor}
                  </p>
                );
              })()}
              <button
                type="button"
                data-testid="viewport-axe-copy-json"
                onClick={() => void copyAxeJson()}
                className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-200 hover:bg-zinc-700"
              >
                Copy JSON
              </button>
              <button
                type="button"
                data-testid="viewport-axe-download-json"
                onClick={downloadAxeJson}
                className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-200 hover:bg-zinc-700"
              >
                Download JSON
              </button>
              {axeCopyNote && (
                <span className="text-zinc-500">{axeCopyNote}</span>
              )}
            </div>
          )}
          {axeFindings && axeFindings.length === 0 && (
            <p className="text-emerald-400">
              No axe findings for this suite and impact filter.
            </p>
          )}
          {axeFindings && axeFindings.length > 0 && (
            <ul className="space-y-2 text-amber-200">
              {axeFindings.map((f, index) => {
                const wcagTags = f.tags.filter(
                  (t) =>
                    t.startsWith("wcag") ||
                    t === "best-practice" ||
                    t === "experimental",
                );
                return (
                  <li
                    key={`${f.kind}-${f.id}-${index}`}
                    className="border-b border-zinc-800/80 pb-2 last:border-0"
                  >
                    <div>
                      [{f.kind}] [{f.impact ?? "n/a"}] {f.id}: {f.help} (
                      {f.nodes} node{f.nodes === 1 ? "" : "s"})
                    </div>
                    {wcagTags.length > 0 && (
                      <div className="text-zinc-500">
                        tags: {wcagTags.join(", ")}
                      </div>
                    )}
                    {f.targets[0] && (
                      <div className="font-mono text-zinc-400">
                        {f.targets[0]}
                        {f.targets.length > 1
                          ? ` (+${f.targets.length - 1} more)`
                          : ""}
                      </div>
                    )}
                    {f.helpUrl && (
                      <a
                        href={f.helpUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 underline hover:text-sky-300"
                      >
                        Deque help
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div
        ref={stageRef}
        className={`flex min-h-0 flex-1 items-center justify-center gap-6 overflow-auto p-4 ${
          compare ? "flex-wrap lg:flex-nowrap" : ""
        }`}
      >
        <DeviceFrame
          label={compare ? "Pane A" : undefined}
          width={width}
          height={height}
          scale={scaleA}
          src={buildViewportLabFrameSrc(path)}
          frameRef={frameARef}
          testId="viewport-frame-a"
          onLoad={onFrameALoad}
        />
        {compare && (
          <DeviceFrame
            label="Pane B"
            width={paneB.width}
            height={paneB.height}
            scale={scaleB}
            src={buildViewportLabFrameSrc(paneB.path)}
            frameRef={frameBRef}
            testId="viewport-frame-b"
            onPreset={(id) => {
              const preset = presetById(id);
              if (!preset) return;
              setPaneB((prev) => ({
                ...prev,
                width: preset.width,
                height: preset.height,
              }));
            }}
          />
        )}
      </div>
    </div>
  );
}

function DeviceFrame({
  label,
  width,
  height,
  scale,
  src,
  frameRef,
  testId,
  onPreset,
  onLoad,
}: {
  label?: string;
  width: number;
  height: number;
  scale: number;
  src: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  testId: string;
  onPreset?: (id: ViewportPresetId) => void;
  onLoad?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-medium text-zinc-400">{label}</span>
          {onPreset &&
            VIEWPORT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                data-viewport-preset-b={p.id}
                onClick={() => onPreset(p.id)}
                className="rounded bg-zinc-800 px-2 py-1 text-[11px] hover:bg-zinc-700"
              >
                {p.id}
              </button>
            ))}
        </div>
      )}
      <div
        className="relative"
        style={{ width: width * scale, height: height * scale }}
      >
        <div
          className="origin-top-left rounded-lg border-2 border-zinc-600 bg-black shadow-2xl transition-[width,height] duration-300 ease-out"
          style={{
            width,
            height,
            transform: `scale(${scale})`,
          }}
        >
          <div className="absolute -top-6 left-0 font-mono text-[10px] text-zinc-500">
            {width}×{height}
          </div>
          <iframe
            ref={frameRef}
            title={label ? `Viewport Lab ${label}` : "Viewport Lab frame"}
            data-testid={testId}
            src={src}
            onLoad={onLoad}
            className="h-full w-full rounded-md bg-white"
            style={{ width, height }}
          />
        </div>
      </div>
    </div>
  );
}
