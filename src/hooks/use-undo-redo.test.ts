import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useUndoRedo } from "./use-undo-redo";

describe("useUndoRedo", () => {
  it("keeps a defined current state when two setStates batch in one tick", () => {
    const { result } = renderHook(() =>
      useUndoRedo({ presetId: "simple-letter", includeLogo: false }),
    );

    act(() => {
      // Mimic Document Generator hydrate + useOneShotBrandSeed in one commit.
      result.current.setState({
        presetId: "simple-letter",
        includeLogo: false,
        body: "hydrated",
      } as { presetId: string; includeLogo: boolean; body?: string });
      result.current.setState((prev) => ({ ...prev, includeLogo: true }));
    });

    expect(result.current.state).toBeDefined();
    expect(result.current.state.presetId).toBe("simple-letter");
    expect(result.current.state.includeLogo).toBe(true);
  });

  it("undo and redo walk the stack", () => {
    const { result } = renderHook(() => useUndoRedo(0));

    act(() => {
      result.current.setState(1);
      result.current.setState(2);
    });
    expect(result.current.state).toBe(2);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.state).toBe(1);

    act(() => {
      result.current.redo();
    });
    expect(result.current.state).toBe(2);
  });

  it("reset replaces history", () => {
    const { result } = renderHook(() => useUndoRedo("a"));

    act(() => {
      result.current.setState("b");
      result.current.reset("z");
    });

    expect(result.current.state).toBe("z");
    expect(result.current.canUndo).toBe(false);
  });
});
