import { describe, expect, it } from "vitest";
import {
  canEditAssignLocal,
  canSubmitAssignLocal,
  type AssignLocalFormGateState,
} from "./assign-local-form-gates";

function gate(
  overrides: Partial<AssignLocalFormGateState> = {},
): AssignLocalFormGateState {
  return {
    accountBlocked: false,
    busy: false,
    stepUpRequired: false,
    resultUnconfirmed: false,
    optionsLoadState: "ready",
    selectionComplete: true,
    mfaCode: "",
    ...overrides,
  };
}

describe("Assign local form submit gates", () => {
  it("enables Save after step-up when an MFA code is present", () => {
    const state = gate({ stepUpRequired: true, mfaCode: "834456" });
    expect(canEditAssignLocal(state)).toBe(false);
    expect(canSubmitAssignLocal(state)).toBe(true);
  });

  it("keeps Save disabled during step-up until a code is entered", () => {
    const state = gate({ stepUpRequired: true, mfaCode: "   " });
    expect(canEditAssignLocal(state)).toBe(false);
    expect(canSubmitAssignLocal(state)).toBe(false);
  });

  it("freezes tenant fields during step-up while allowing MFA resume", () => {
    const beforeCode = gate({ stepUpRequired: true, mfaCode: "" });
    expect(canEditAssignLocal(beforeCode)).toBe(false);
    expect(canSubmitAssignLocal(beforeCode)).toBe(false);

    const withCode = gate({ stepUpRequired: true, mfaCode: "123456" });
    expect(canEditAssignLocal(withCode)).toBe(false);
    expect(canSubmitAssignLocal(withCode)).toBe(true);
  });

  it("disables Save when options are still loading or the selection is incomplete", () => {
    expect(
      canSubmitAssignLocal(gate({ optionsLoadState: "loading" })),
    ).toBe(false);
    expect(
      canSubmitAssignLocal(gate({ selectionComplete: false })),
    ).toBe(false);
    expect(canSubmitAssignLocal(gate({ accountBlocked: true }))).toBe(false);
    expect(canSubmitAssignLocal(gate({ resultUnconfirmed: true }))).toBe(false);
  });

  it("allows a normal first Save when MFA step-up is not yet required", () => {
    const state = gate();
    expect(canEditAssignLocal(state)).toBe(true);
    expect(canSubmitAssignLocal(state)).toBe(true);
  });
});
