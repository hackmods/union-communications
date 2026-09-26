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
  type AxeRunResult,
  type OverflowResult,
  type ViewportLabLocale,
  buildViewportLabSearchParams,
  ensureTrailingSlashPath,
  measureDocumentOverflow,
  parseViewportLabSearchParams,
  sanitizeViewportFramePath,
  swapLocaleInPath,
} from "@/lib/ops/viewport-lab-api";
import {
  VIEWPORT_LAB_API_VERSION,
  VIEWPORT_LAB_CAPABILITIES_V2,
  VIEWPORT_PRESETS,
  matchPreset,
  presetById,
  type ViewportPresetId,
} from "@/lib/ops/viewport-presets";

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
  runAxe: (options?: { colorContrast?: boolean }) => Promise<AxeRunResult>;
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
  includeContrast: boolean,
): Promise<AxeRunResult> {
  try {
    if (!frame) return { ok: false, error: "frame_unavailable" };
    const doc = await waitForFrameDocument(frame);
    if (!doc?.defaultView) return { ok: false, error: "frame_unavailable" };

    const axeCore = await import("axe-core");
    const options: {
      resultTypes: ["violations"];
      iframes: boolean;
      rules?: { "color-contrast": { enabled: boolean } };
    } = {
      resultTypes: ["violations"],
      iframes: true,
    };
    if (!includeContrast) {
      options.rules = { "color-contrast": { enabled: false } };
    }
    const results = await axeCore.default.run(frame, options);
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    return {
      ok: true,
      violations: serious.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
      })),
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
  const [axeFindings, setAxeFindings] = useState<AxeFinding[] | null>(null);
  const [axeError, setAxeError] = useState<string | null>(null);
  const [axeBusy, setAxeBusy] = useState(false);
  const [includeContrast, setIncludeContrast] = useState(false);
  const [stageSize, setStageSize] = useState({ w: 1200, h: 800 });

  const frameARef = useRef<HTMLIFrameElement>(null);
  const frameBRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

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

  const applyViewport = useCallback((w: number, h: number) => {
    const nextW = clampDim(w);
    const nextH = clampDim(h);
    setWidth(nextW);
    setHeight(nextH);
    setCustomW(String(nextW));
    setCustomH(String(nextH));
  }, []);

  const navigateFrame = useCallback((raw: string) => {
    const sanitized = sanitizeViewportFramePath(raw);
    if (!sanitized) {
      setOverflowNote("Path blocked (Hub/Portal/lab) or invalid.");
      return;
    }
    const next = ensureTrailingSlashPath(sanitized);
    setPath(next);
    setPathDraft(next);
    setPaneB((prev) => ({ ...prev, path: next }));
    setOverflowNote(null);
  }, []);

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
    },
    [path],
  );

  const checkOverflow = useCallback((): OverflowResult => {
    const doc = frameARef.current?.contentDocument ?? null;
    const result = doc
      ? measureDocumentOverflow(doc)
      : { error: "frame_unavailable" };
    if ("error" in result) setOverflowNote(`Overflow: ${result.error}`);
    else setOverflowNote(`Horizontal overflow: ${result.horizontalPx}px`);
    return result;
  }, []);

  const runAxe = useCallback(
    async (options?: { colorContrast?: boolean }): Promise<AxeRunResult> => {
      setAxeBusy(true);
      setAxeError(null);
      const result = await runAxeInFrame(
        frameARef.current,
        options?.colorContrast ?? includeContrast,
      );
      setAxeBusy(false);
      if (!result.ok) {
        setAxeFindings(null);
        setAxeError(result.error);
        return result;
      }
      setAxeFindings(result.violations);
      return result;
    },
    [includeContrast],
  );

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

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
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
                value={pathDraft}
                onChange={(e) => setPathDraft(e.target.value)}
                className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-sm text-zinc-100"
              />
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
          {scaleA < 1 ? ` · scaled ${(scaleA * 100).toFixed(0)}%` : ""}
          {overflowNote ? ` · ${overflowNote}` : ""}
        </p>
      </header>

      {(axeFindings || axeError) && (
        <div
          data-testid="viewport-lab-axe-results"
          className="max-h-40 shrink-0 overflow-auto border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-xs"
        >
          {axeError && <p className="text-red-400">Axe error: {axeError}</p>}
          {axeFindings && axeFindings.length === 0 && (
            <p className="text-emerald-400">
              No serious/critical axe violations.
            </p>
          )}
          {axeFindings && axeFindings.length > 0 && (
            <ul className="space-y-1 text-amber-200">
              {axeFindings.map((f) => (
                <li key={f.id}>
                  [{f.impact}] {f.id}: {f.help} ({f.nodes} node
                  {f.nodes === 1 ? "" : "s"})
                </li>
              ))}
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
          src={path}
          frameRef={frameARef}
          testId="viewport-frame-a"
        />
        {compare && (
          <DeviceFrame
            label="Pane B"
            width={paneB.width}
            height={paneB.height}
            scale={scaleB}
            src={paneB.path}
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
}: {
  label?: string;
  width: number;
  height: number;
  scale: number;
  src: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  testId: string;
  onPreset?: (id: ViewportPresetId) => void;
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
            className="h-full w-full rounded-md bg-white"
            style={{ width, height }}
          />
        </div>
      </div>
    </div>
  );
}
