"use client";

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useOneShotBrandSeed } from "./use-one-shot-brand-seed";

describe("useOneShotBrandSeed", () => {
  it("does not call seed before hydrate", () => {
    const seed = vi.fn();
    renderHook(() => useOneShotBrandSeed(false, seed));
    expect(seed).not.toHaveBeenCalled();
  });

  it("does not call seed when ready is false", () => {
    const seed = vi.fn();
    renderHook(() => useOneShotBrandSeed(true, seed, false));
    expect(seed).not.toHaveBeenCalled();
  });

  it("calls seed once after hydrate and ready", () => {
    const seed = vi.fn();
    const { rerender } = renderHook(
      ({ hydrated, ready }) => useOneShotBrandSeed(hydrated, seed, ready),
      { initialProps: { hydrated: false, ready: true } },
    );

    rerender({ hydrated: true, ready: true });
    expect(seed).toHaveBeenCalledTimes(1);

    rerender({ hydrated: true, ready: false });
    rerender({ hydrated: false, ready: true });
    rerender({ hydrated: true, ready: true });
    expect(seed).toHaveBeenCalledTimes(1);
  });

  it("calls seed when ready flips true after hydrate", () => {
    const seed = vi.fn();
    const { rerender } = renderHook(
      ({ hydrated, ready }) => useOneShotBrandSeed(hydrated, seed, ready),
      { initialProps: { hydrated: true, ready: false } },
    );
    expect(seed).not.toHaveBeenCalled();

    rerender({ hydrated: true, ready: true });
    expect(seed).toHaveBeenCalledTimes(1);
  });
});
