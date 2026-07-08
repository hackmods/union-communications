import type { DemoUser } from "@/types/auth";

/** Dev-only demo accounts — replace with DB in production */
export const DEMO_USERS: DemoUser[] = [
  {
    id: "user-president-243",
    email: "president@local243.ca",
    password: "demo123",
    name: "Local 243 President",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    roles: ["local_president"],
    requiresMfa: true,
  },
  {
    id: "user-steward-243",
    email: "steward@local243.ca",
    password: "demo123",
    name: "Local 243 Steward",
    unionId: "union-opseu",
    divisionId: "division-caat",
    localId: "local-243",
    roles: ["local_steward"],
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
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  return user ?? null;
}
