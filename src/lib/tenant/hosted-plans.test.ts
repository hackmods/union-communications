import { describe, expect, it } from "vitest";
import {
  FREE_HUB_MODULES,
  UNSET_HOSTED_PLAN,
  accessClassForCommercial,
  isHostedPlansEnabled,
  resolveEffectiveHubModules,
  resolveEffectivePortalSurfaces,
  resolveInheritedPlan,
  type HostedPlanRecord,
} from "@/lib/tenant/hosted-plans";
import type { HubModule } from "@/types/tenant";

const ALL: HubModule[] = [
  "comms",
  "grievance",
  "discussions",
  "bylaws",
  "proposals",
  "portal",
  "time",
  "documents",
];

const fullMember: HostedPlanRecord = {
  ...UNSET_HOSTED_PLAN,
  accessClass: "full",
  commercialClass: "member",
};

const fullPaid: HostedPlanRecord = {
  ...UNSET_HOSTED_PLAN,
  accessClass: "full",
  commercialClass: "paid",
  seatSku: "solo",
  seatCap: 1,
};

const freePlan: HostedPlanRecord = {
  ...UNSET_HOSTED_PLAN,
  accessClass: "free",
};

describe("hosted-plans catalog", () => {
  it("Member and Paid map to the same access class", () => {
    expect(accessClassForCommercial("member")).toBe("full");
    expect(accessClassForCommercial("paid")).toBe("full");
    expect(accessClassForCommercial("unset")).toBe("unset");
  });

  it("Member and Paid resolve identical modules when subset unset", () => {
    const memberMods = resolveEffectiveHubModules({
      unionModules: ALL,
      unionPlan: fullMember,
      localPlan: UNSET_HOSTED_PLAN,
      enforcementEnabled: true,
    });
    const paidMods = resolveEffectiveHubModules({
      unionModules: ALL,
      unionPlan: fullPaid,
      localPlan: UNSET_HOSTED_PLAN,
      enforcementEnabled: true,
    });
    expect(memberMods).toEqual(paidMods);
    expect(memberMods).toEqual(ALL);
  });

  it("fails open when CapRover enforcement is off", () => {
    expect(
      resolveEffectiveHubModules({
        unionModules: ALL,
        unionPlan: freePlan,
        localPlan: UNSET_HOSTED_PLAN,
        enforcementEnabled: false,
      }),
    ).toEqual(ALL);
  });

  it("caps to Free allowlist when enforcement on and plan free", () => {
    const mods = resolveEffectiveHubModules({
      unionModules: ALL,
      unionPlan: freePlan,
      localPlan: UNSET_HOSTED_PLAN,
      enforcementEnabled: true,
    });
    expect(mods).toEqual(FREE_HUB_MODULES.filter((m) => ALL.includes(m)));
  });

  it("treats unset as Free when enforcement is on", () => {
    const mods = resolveEffectiveHubModules({
      unionModules: ALL,
      unionPlan: UNSET_HOSTED_PLAN,
      localPlan: UNSET_HOSTED_PLAN,
      enforcementEnabled: true,
    });
    expect(mods).toEqual(FREE_HUB_MODULES.filter((m) => ALL.includes(m)));
  });

  it("local Free under union Full stays capped", () => {
    const mods = resolveEffectiveHubModules({
      unionModules: ALL,
      unionPlan: fullPaid,
      localPlan: freePlan,
      enforcementEnabled: true,
    });
    expect(mods).toEqual(FREE_HUB_MODULES.filter((m) => ALL.includes(m)));
  });

  it("local unset inherits union Full out of the box", () => {
    const mods = resolveEffectiveHubModules({
      unionModules: ALL,
      unionPlan: fullMember,
      localPlan: UNSET_HOSTED_PLAN,
      enforcementEnabled: true,
    });
    expect(mods).toEqual(ALL);
  });

  it("subset intersects and never expands past union modules", () => {
    const unionPlan: HostedPlanRecord = {
      ...fullPaid,
      moduleSubset: ["grievance", "discussions", "time"],
    };
    const localPlan: HostedPlanRecord = {
      ...UNSET_HOSTED_PLAN,
      accessClass: "full",
      moduleSubset: ["discussions", "documents", "time"],
    };
    const mods = resolveEffectiveHubModules({
      unionModules: ALL,
      unionPlan,
      localPlan,
      enforcementEnabled: true,
    });
    expect(mods.sort()).toEqual(["discussions", "time"].sort());
  });

  it("portal Free surfaces are a subset of defaults", () => {
    const surfaces = resolveEffectivePortalSurfaces({
      unionSurfaces: [
        "announcements",
        "news",
        "discussions",
        "myCases",
        "feedback",
      ],
      unionPlan: freePlan,
      localPlan: UNSET_HOSTED_PLAN,
      enforcementEnabled: true,
    });
    expect(surfaces).toEqual(["announcements", "discussions"]);
  });

  it("inherit lifts commercial member to full access", () => {
    const union: HostedPlanRecord = {
      ...UNSET_HOSTED_PLAN,
      commercialClass: "member",
    };
    const resolved = resolveInheritedPlan(union, UNSET_HOSTED_PLAN);
    expect(resolved.accessClass).toBe("full");
    expect(resolved.commercialClass).toBe("member");
  });

  it("reads CapRover env flag", () => {
    expect(isHostedPlansEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(
      false,
    );
    expect(
      isHostedPlansEnabled({
        UNIONOPS_HOSTED_PLANS_ENABLED: "true",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
  });
});
