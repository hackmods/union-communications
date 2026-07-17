import type { DemoUser } from "@/types/auth";

/** Dev-only demo accounts - replace with DB in production */
export const DEMO_USERS: DemoUser[] = [
  {
    id: "user-president-243",
    email: "president@local243.ca",
    password: "demo123",
    name: "Local 243 President",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    accessibleLocalIds: ["local-243"],
    roles: ["local_president"],
    requiresMfa: true,
  },
  {
    id: "user-steward-243",
    email: "steward@local243.ca",
    password: "demo123",
    name: "Local 243 Steward (FT)",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    accessibleLocalIds: ["local-243"],
    roles: ["local_steward"],
    requiresMfa: true,
  },
  {
    id: "user-steward-243-pt",
    email: "steward-pt@local243.ca",
    password: "demo123",
    name: "Local 243 Steward (PT)",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    bargainingUnitId: "bu-243-pt",
    accessibleLocalIds: ["local-243"],
    roles: ["local_steward"],
    requiresMfa: true,
  },
  {
    id: "user-division-admin",
    email: "caat-admin@opseu.org",
    password: "demo123",
    name: "CAAT Division Admin",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    accessibleLocalIds: ["local-243", "local-560"],
    roles: ["division_admin"],
    requiresMfa: true,
  },
  {
    id: "user-stability-243",
    email: "stability@local243.ca",
    password: "demo123",
    name: "Stability Committee Rep",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    accessibleLocalIds: ["local-243"],
    roles: ["stability_member"],
    requiresMfa: true,
  },
  {
    id: "user-solo",
    email: "solo@example.ca",
    password: "demo123",
    name: "Solo Steward",
    roles: ["solo_account"],
    requiresMfa: false,
  },
];

export function findDemoUser(email: string, password: string): DemoUser | null {
  const user = DEMO_USERS.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  return user ?? null;
}
