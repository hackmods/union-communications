import { describe, it, expect } from "vitest";
import {
  calculateAppealDueDate,
  calculateStepDueDate,
  daysUntilDue,
  getAppealDueDate,
  getCurrentStepDueDate,
  isOverdue,
} from "@/lib/grievance/deadlines";
import {
  canEditGrievance,
  canViewGrievance,
} from "@/lib/grievance/access";
import { buildEmailDraft } from "@/lib/grievance/email-templates";
import {
  buildGrievanceBundle,
  bundleToPdfLines,
} from "@/lib/grievance/export";
import type { Grievance, GrievanceOutcome } from "@/types/grievance";

const config = {
  steps: [
    { number: 1, name: "Step 1", responseDays: 5 },
    { number: 2, name: "Step 2", responseDays: 10 },
    { number: 3, name: "Step 3", responseDays: 15 },
    {
      number: 4,
      name: "Arbitration",
      responseDays: null,
      appealDays: 30,
    },
  ],
};

const sampleGrievance: Grievance = {
  id: "grev-test",
  unionId: "union-opseu",
  localId: "local-243",
  category: "Discipline",
  status: "open",
  currentStep: 1,
  filedAt: "2026-01-01T00:00:00.000Z",
  assignedStewardId: "user-steward-243",
  createdById: "user-president-243",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const sampleOutcome: GrievanceOutcome = {
  id: "gout-1",
  grievanceId: sampleGrievance.id,
  outcomeType: "upheld",
  remedy: "Reinstatement",
  decidedAt: "2026-06-01T00:00:00.000Z",
  recordedById: "user-president-243",
};

describe("deadline calculator", () => {
  it("adds response days to filed date", () => {
    const due = calculateStepDueDate(
      "2026-01-01T00:00:00.000Z",
      config.steps[0],
    );
    expect(due?.toISOString().slice(0, 10)).toBe("2026-01-06");
  });

  it("returns null for arbitration step response deadline", () => {
    const due = getCurrentStepDueDate(
      sampleGrievance.filedAt,
      4,
      config,
    );
    expect(due).toBeNull();
  });

  it("computes appeal deadline from decidedAt + appealDays", () => {
    const due = calculateAppealDueDate(
      "2026-06-01T00:00:00.000Z",
      config.steps[3],
    );
    expect(due?.toISOString().slice(0, 10)).toBe("2026-07-01");
  });

  it("resolves appeal due via config helper", () => {
    const due = getAppealDueDate(
      "2026-06-01T00:00:00.000Z",
      4,
      config,
    );
    expect(due?.toISOString().slice(0, 10)).toBe("2026-07-01");
  });

  it("detects overdue deadlines", () => {
    const past = new Date("2020-01-01");
    expect(isOverdue(past)).toBe(true);
    expect(isOverdue(past, "2020-01-02")).toBe(false);
  });

  it("computes days until due", () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const days = daysUntilDue(future);
    expect(days).toBeGreaterThanOrEqual(2);
    expect(days).toBeLessThanOrEqual(4);
  });
});

describe("grievance export bundle", () => {
  it("includes outcome and appeal due date", () => {
    const bundle = buildGrievanceBundle(
      {
        grievance: { ...sampleGrievance, currentStep: 4 },
        events: [],
        notes: [],
        outcome: sampleOutcome,
      },
      config,
    );
    expect(bundle.outcome?.outcomeType).toBe("upheld");
    expect(bundle.appealDueDate?.slice(0, 10)).toBe("2026-07-01");
    const lines = bundleToPdfLines(bundle, "243");
    expect(lines.some((l) => l.includes("ARBITRATION"))).toBe(true);
    expect(lines.some((l) => l.includes("Appeal deadline"))).toBe(true);
    expect(lines.some((l) => l.includes("Reinstatement"))).toBe(true);
  });

  it("omits appeal due when no outcome", () => {
    const bundle = buildGrievanceBundle(
      {
        grievance: sampleGrievance,
        events: [],
        notes: [],
      },
      config,
    );
    expect(bundle.outcome).toBeNull();
    expect(bundle.appealDueDate).toBeNull();
  });
});

describe("grievance access control", () => {
  it("allows president to view local grievance", () => {
    expect(
      canViewGrievance(
        sampleGrievance,
        "user-president-243",
        "union-opseu",
        "local-243",
        ["local_president"],
      ),
    ).toBe(true);
  });

  it("blocks steward from unassigned case", () => {
    expect(
      canViewGrievance(
        sampleGrievance,
        "user-other-steward",
        "union-opseu",
        "local-243",
        ["local_steward"],
      ),
    ).toBe(false);
  });

  it("allows assigned steward to edit", () => {
    expect(
      canEditGrievance(
        sampleGrievance,
        "user-steward-243",
        "union-opseu",
        "local-243",
        ["local_steward"],
      ),
    ).toBe(true);
  });

  it("allows division_admin to view another local grievance", () => {
    expect(
      canViewGrievance(
        { ...sampleGrievance, localId: "local-560" },
        "user-division-admin",
        "union-opseu",
        "local-243",
        ["division_admin"],
      ),
    ).toBe(true);
  });

  it("blocks local_president from another local without switch", () => {
    expect(
      canViewGrievance(
        { ...sampleGrievance, localId: "local-560" },
        "user-president-243",
        "union-opseu",
        "local-243",
        ["local_president"],
      ),
    ).toBe(false);
  });
});

describe("email templates", () => {
  it("generates EN draft with draft warning", () => {
    const draft = buildEmailDraft(
      "step1_meeting",
      sampleGrievance,
      config,
      "en",
      "243",
    );
    expect(draft.subject).toContain("Meeting request");
    expect(draft.body).toContain("DRAFT");
    expect(draft.body).toContain("Local 243");
  });

  it("generates FR draft", () => {
    const draft = buildEmailDraft(
      "member_update",
      { ...sampleGrievance, memberPseudonym: "Membre X" },
      config,
      "fr",
    );
    expect(draft.subject).toContain("Mise à jour");
    expect(draft.body).toContain("BROUILLON");
  });
});
