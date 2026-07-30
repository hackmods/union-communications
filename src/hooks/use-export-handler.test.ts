"use client";

import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    key === "exportFailed" ? "Export failed. Try again." : key,
}));

import { useExportHandler } from "./use-export-handler";

describe("useExportHandler", () => {
  it("clears error and reports success when the action resolves", async () => {
    const { result } = renderHook(() => useExportHandler());

    let ok = false;
    await act(async () => {
      ok = await result.current.runExport(async () => undefined);
    });

    expect(ok).toBe(true);
    expect(result.current.exportError).toBeNull();
    expect(result.current.exporting).toBe(false);
  });

  it("surfaces Error.message and clears the busy flag on failure", async () => {
    const { result } = renderHook(() => useExportHandler());

    let ok = true;
    await act(async () => {
      ok = await result.current.runExport(async () => {
        throw new Error("Logo missing");
      });
    });

    expect(ok).toBe(false);
    expect(result.current.exportError).toBe("Logo missing");
    expect(result.current.exporting).toBe(false);
  });

  it("falls back to the default message when the thrown value has no message", async () => {
    const { result } = renderHook(() => useExportHandler());

    await act(async () => {
      await result.current.runExport(async () => {
        throw new Error("   ");
      });
    });

    expect(result.current.exportError).toBe("Export failed. Try again.");
  });

  it("honours errorMessage override and skipBusy", async () => {
    const { result } = renderHook(() => useExportHandler());

    await act(async () => {
      await result.current.runExport(
        async () => {
          throw new Error("ignored");
        },
        { errorMessage: "Custom fail", skipBusy: true },
      );
    });

    expect(result.current.exportError).toBe("Custom fail");
    expect(result.current.exporting).toBe(false);
  });

  it("clearExportError resets the alert", async () => {
    const { result } = renderHook(() => useExportHandler());

    await act(async () => {
      await result.current.runExport(async () => {
        throw new Error("boom");
      });
    });
    expect(result.current.exportError).toBe("boom");

    act(() => {
      result.current.clearExportError();
    });
    expect(result.current.exportError).toBeNull();
  });
});
