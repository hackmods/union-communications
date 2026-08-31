import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PROPOSAL_TRACKER_STORAGE_KEY,
  createEmptyProposalTrackerDraft,
  isProposalTrackerDraft,
  loadProposalTrackerDraft,
  saveProposalTrackerDraft,
} from "./draft";
import type { ProposalTrackerDraft } from "./types";

const validDraft: ProposalTrackerDraft = {
  rows: [
    {
      id: "row-1",
      article: "12.01",
      currentLanguage: "Hours of work.",
      unionProposal: "Include flex language.",
      employerCounter: "No change.",
      status: "open",
      notes: "Wage package",
    },
  ],
};

describe("isProposalTrackerDraft", () => {
  it("accepts a complete draft", () => {
    expect(isProposalTrackerDraft(validDraft)).toBe(true);
    expect(isProposalTrackerDraft(createEmptyProposalTrackerDraft())).toBe(
      true,
    );
  });

  it("rejects invalid status, missing fields, and non-objects", () => {
    expect(
      isProposalTrackerDraft({
        rows: [{ ...validDraft.rows[0], status: "won" }],
      }),
    ).toBe(false);
    expect(
      isProposalTrackerDraft({
        rows: [{ ...validDraft.rows[0], notes: 12 }],
      }),
    ).toBe(false);
    expect(isProposalTrackerDraft({ rows: "nope" })).toBe(false);
    expect(isProposalTrackerDraft(null)).toBe(false);
  });
});

describe("proposal tracker draft persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("round-trips a valid draft through localStorage", () => {
    expect(saveProposalTrackerDraft(validDraft)).toBe(true);
    expect(loadProposalTrackerDraft()).toEqual(validDraft);
    expect(window.localStorage.getItem(PROPOSAL_TRACKER_STORAGE_KEY)).toContain(
      "12.01",
    );
  });

  it("ignores corrupt or schema-invalid stored JSON", () => {
    window.localStorage.setItem(PROPOSAL_TRACKER_STORAGE_KEY, "{not-json");
    expect(loadProposalTrackerDraft()).toBeNull();

    window.localStorage.setItem(
      PROPOSAL_TRACKER_STORAGE_KEY,
      JSON.stringify({ rows: [{ ...validDraft.rows[0], status: "won" }] }),
    );
    expect(loadProposalTrackerDraft()).toBeNull();
  });

  it("returns false when localStorage throws (private mode / quota)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    expect(saveProposalTrackerDraft(validDraft)).toBe(false);
  });
});
