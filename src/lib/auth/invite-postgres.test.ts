import { describe, expect, it } from "vitest";
import { invitesPostgresEnabled } from "@/lib/auth/invite-postgres";

describe("invitesPostgresEnabled", () => {
  it("requires AUTH_USERS_BACKEND=postgres and DATABASE_URL", () => {
    expect(
      invitesPostgresEnabled({
        AUTH_USERS_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe(true);
    expect(
      invitesPostgresEnabled({
        AUTH_USERS_BACKEND: "memory",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe(false);
    expect(
      invitesPostgresEnabled({
        AUTH_USERS_BACKEND: "postgres",
      }),
    ).toBe(false);
  });
});
