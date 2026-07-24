import { describe, expect, it } from "vitest";
import {
  canAccessTravelModule,
  canEditDraftTravelAuth,
  canElevateTravel,
} from "./access";
import {
  estimatedTotal,
  reconcileDifference,
  sumLineItems,
} from "./reconcile";
import type { TravelAuthorization } from "@/types/travel";

const baseAuth: TravelAuthorization = {
  id: "ta-1",
  unionId: "u1",
  localId: "l1",
  requestedById: "user-steward",
  requestedByName: "Sam Steward",
  purpose: "Convention",
  eventName: "Annual",
  eventStartDate: "2026-09-01",
  eventEndDate: "2026-09-03",
  estimatedCosts: {
    travel: 100,
    lodging: 200,
    meals: 50,
    registration: 75,
    other: 0,
  },
  status: "requested",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("travel access", () => {
  it("allows stewards and treasurers", () => {
    expect(canAccessTravelModule(["local_steward"])).toBe(true);
    expect(canAccessTravelModule(["local_exec"])).toBe(true);
    expect(canAccessTravelModule(["local_president"])).toBe(true);
    expect(canAccessTravelModule([])).toBe(false);
  });

  it("elevates president/exec for money actions", () => {
    expect(canElevateTravel(["local_steward"])).toBe(false);
    expect(canElevateTravel(["local_exec"])).toBe(true);
    expect(canElevateTravel(["local_president"])).toBe(true);
  });

  it("lets claimant edit own draft only", () => {
    expect(
      canEditDraftTravelAuth(baseAuth, "user-steward", ["local_steward"]),
    ).toBe(true);
    expect(
      canEditDraftTravelAuth(baseAuth, "other", ["local_steward"]),
    ).toBe(false);
    expect(
      canEditDraftTravelAuth(
        { ...baseAuth, status: "approved" },
        "user-steward",
        ["local_steward"],
      ),
    ).toBe(false);
  });
});

describe("travel reconcile math", () => {
  it("sums line items and computes difference", () => {
    const items = [
      {
        id: "1",
        date: "2026-09-01",
        category: "travel",
        amount: 120,
        description: "Train",
      },
      {
        id: "2",
        date: "2026-09-02",
        category: "meals",
        amount: 40,
        description: "Per diem",
      },
    ];
    expect(sumLineItems(items)).toBe(160);
    // Spent more than advance → positive → local owes officer
    expect(reconcileDifference(items, 100)).toBe(60);
    // Unused advance → negative → officer owes local
    expect(reconcileDifference(items, 200)).toBe(-40);
  });

  it("totals estimated costs", () => {
    expect(
      estimatedTotal({
        travel: 10,
        lodging: 20,
        meals: 30,
        registration: 40,
        other: 5,
      }),
    ).toBe(105);
  });
});
