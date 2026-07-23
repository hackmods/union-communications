/**
 * Cross-module RBAC matrix — mirrors docs/RBAC.md hard rules (RBAC-003).
 * Update this table when the doc matrix changes.
 */
import { describe, expect, it } from "vitest";
import {
  canAccessGrievanceModule,
  canCrossLocalGrievance,
  canEditGrievance,
  canViewGrievance,
  isElevatedGrievanceRole,
} from "@/lib/grievance/access";
import {
  canAccessBumpingModule,
  canEditBumpingCase,
  canViewBumpingCase,
  canWriteBumping,
} from "@/lib/bumping/access";
import {
  canAccessTimeModule,
  canAdminTime,
  canClockTime,
} from "@/lib/time/access";
import {
  canDeleteSharedContent,
  canManageQolContent,
  canPublishMarketplace,
} from "@/lib/qol/access";
import type { UserRole } from "@/types/tenant";
import type { Grievance } from "@/types/grievance";
import type { BumpingCase } from "@/types/bumping";

const ALL_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
  "local_steward",
  "stability_member",
  "solo_account",
];

const sampleGrievance: Grievance = {
  id: "g1",
  unionId: "union-a",
  localId: "local-1",
  category: "Hours",
  status: "open",
  currentStep: 1,
  filedAt: new Date().toISOString(),
  assignedStewardId: "steward-1",
  createdById: "pres-1",
  updatedAt: new Date().toISOString(),
};

const sampleBump: BumpingCase = {
  id: "b1",
  unionId: "union-a",
  localId: "local-1",
  memberRef: "M",
  seniorityDate: "2018-01-01",
  currentPosition: "A",
  targetPosition: "B",
  scenario: "s",
  status: "open",
  incumbentPosition: {
    title: "t",
    duties: "",
    qualifications: "",
    seniorityNotes: "",
  },
  bumpingPosition: {
    title: "t",
    duties: "",
    qualifications: "",
    seniorityNotes: "",
  },
  checklist: {},
  createdById: "pres-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("RBAC matrix (docs/RBAC.md)", () => {
  it("grievance module access roles", () => {
    for (const role of ALL_ROLES) {
      const allowed = ![
        "stability_member",
      ].includes(role);
      expect(canAccessGrievanceModule([role])).toBe(allowed);
    }
  });

  it("only elevated admin roles cross-local without switcher", () => {
    expect(canCrossLocalGrievance(["local_president"])).toBe(false);
    expect(canCrossLocalGrievance(["local_steward"])).toBe(false);
    expect(canCrossLocalGrievance(["union_admin"])).toBe(true);
    expect(canCrossLocalGrievance(["division_admin"])).toBe(true);
    expect(canCrossLocalGrievance(["platform_admin"])).toBe(true);
  });

  it("steward views only assigned grievances; local_exec elevated view no edit", () => {
    expect(
      canViewGrievance(
        sampleGrievance,
        "steward-1",
        "union-a",
        "local-1",
        ["local_steward"],
      ),
    ).toBe(true);
    expect(
      canViewGrievance(
        sampleGrievance,
        "other",
        "union-a",
        "local-1",
        ["local_steward"],
      ),
    ).toBe(false);
    expect(isElevatedGrievanceRole(["local_exec"])).toBe(true);
    expect(
      canEditGrievance(
        sampleGrievance,
        "exec-1",
        "union-a",
        "local-1",
        ["local_exec"],
      ),
    ).toBe(false);
  });

  it("bumping: stewards read; stability/president write", () => {
    expect(canAccessBumpingModule(["local_steward"])).toBe(true);
    expect(canWriteBumping(["local_steward"])).toBe(false);
    expect(canWriteBumping(["stability_member"])).toBe(true);
    expect(canWriteBumping(["local_president"])).toBe(true);
    expect(
      canViewBumpingCase(sampleBump, "union-a", "local-1", ["local_steward"]),
    ).toBe(true);
    expect(
      canEditBumpingCase(sampleBump, "union-a", "local-1", ["local_steward"]),
    ).toBe(false);
  });

  it("time: stewards clock; presidents admin", () => {
    expect(canAccessTimeModule(["local_steward"])).toBe(true);
    expect(canClockTime(["local_steward"])).toBe(true);
    expect(canAdminTime(["local_steward"])).toBe(false);
    expect(canAdminTime(["local_president"])).toBe(true);
  });

  it("QOL delete is owner or elevated (includes division_admin)", () => {
    expect(canManageQolContent(["local_steward"])).toBe(true);
    expect(canPublishMarketplace(["local_steward"])).toBe(true);
    expect(canDeleteSharedContent(["local_steward"], "owner", "other")).toBe(
      false,
    );
    expect(canDeleteSharedContent(["local_steward"], "owner", "owner")).toBe(
      true,
    );
    expect(canDeleteSharedContent(["division_admin"], "owner", "other")).toBe(
      true,
    );
  });

  it("never allows cross-union grievance views", () => {
    expect(
      canViewGrievance(
        sampleGrievance,
        "steward-1",
        "other-union",
        "local-1",
        ["platform_admin"],
      ),
    ).toBe(false);
  });
});
