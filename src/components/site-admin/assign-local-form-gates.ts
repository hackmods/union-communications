export type AssignLocalOptionsLoadState = "loading" | "ready" | "error";

export type AssignLocalFormGateState = {
  accountBlocked: boolean;
  busy: boolean;
  stepUpRequired: boolean;
  resultUnconfirmed: boolean;
  optionsLoadState: AssignLocalOptionsLoadState;
  selectionComplete: boolean;
  mfaCode: string;
};

/** Freeze tenant fields during MFA step-up; do not use this for Save. */
export function canEditAssignLocal(state: AssignLocalFormGateState): boolean {
  return (
    !state.accountBlocked &&
    !state.busy &&
    !state.stepUpRequired &&
    !state.resultUnconfirmed &&
    state.optionsLoadState === "ready"
  );
}

/**
 * Save enablement after step-up. Must stay independent of `canEditAssignLocal`
 * so a filled MFA code can resubmit while tenant fields remain frozen.
 */
export function canSubmitAssignLocal(state: AssignLocalFormGateState): boolean {
  return (
    !state.accountBlocked &&
    !state.busy &&
    !state.resultUnconfirmed &&
    state.optionsLoadState === "ready" &&
    state.selectionComplete &&
    !(state.stepUpRequired && !state.mfaCode.trim())
  );
}
