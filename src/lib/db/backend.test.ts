import { describe, expect, it } from "vitest";
import {
  attachmentsDbBackend,
  auditDbBackend,
  bumpingDbBackend,
  committeesDbBackend,
  discussionsDbBackend,
  electionsDbBackend,
  grievanceDbBackend,
  informalLogDbBackend,
  isMemoryCaseDataActive,
  ledgerDbBackend,
  minutesDbBackend,
  officersDbBackend,
  pollsDbBackend,
  tasksDbBackend,
  timeDbBackend,
  travelDbBackend,
} from "@/lib/db/backend";

describe("db backend flags", () => {
  it("defaults to memory", () => {
    expect(grievanceDbBackend({})).toBe("memory");
    expect(bumpingDbBackend({})).toBe("memory");
    expect(auditDbBackend({})).toBe("memory");
    expect(timeDbBackend({})).toBe("memory");
    expect(attachmentsDbBackend({})).toBe("memory");
    expect(discussionsDbBackend({})).toBe("memory");
    expect(tasksDbBackend({})).toBe("memory");
    expect(informalLogDbBackend({})).toBe("memory");
    expect(minutesDbBackend({})).toBe("memory");
    expect(ledgerDbBackend({})).toBe("memory");
    expect(officersDbBackend({})).toBe("memory");
    expect(travelDbBackend({})).toBe("memory");
    expect(committeesDbBackend({})).toBe("memory");
    expect(electionsDbBackend({})).toBe("memory");
    expect(pollsDbBackend({})).toBe("memory");
    expect(isMemoryCaseDataActive({})).toBe(true);
  });

  it("requires DATABASE_URL for postgres backends", () => {
    expect(
      grievanceDbBackend({ GRIEVANCE_DB_BACKEND: "postgres" }),
    ).toBe("memory");
    expect(timeDbBackend({ TIME_DB_BACKEND: "postgres" })).toBe("memory");
    expect(
      attachmentsDbBackend({ ATTACHMENTS_DB_BACKEND: "postgres" }),
    ).toBe("memory");
    expect(tasksDbBackend({ TASKS_DB_BACKEND: "postgres" })).toBe("memory");
    expect(
      informalLogDbBackend({ INFORMAL_LOG_DB_BACKEND: "postgres" }),
    ).toBe("memory");
    expect(minutesDbBackend({ MINUTES_DB_BACKEND: "postgres" })).toBe("memory");
    expect(ledgerDbBackend({ LEDGER_DB_BACKEND: "postgres" })).toBe("memory");
    expect(officersDbBackend({ OFFICERS_DB_BACKEND: "postgres" })).toBe(
      "memory",
    );
    expect(travelDbBackend({ TRAVEL_DB_BACKEND: "postgres" })).toBe("memory");
    expect(committeesDbBackend({ COMMITTEES_DB_BACKEND: "postgres" })).toBe(
      "memory",
    );
    expect(electionsDbBackend({ ELECTIONS_DB_BACKEND: "postgres" })).toBe(
      "memory",
    );
    expect(pollsDbBackend({ POLLS_DB_BACKEND: "postgres" })).toBe("memory");
    expect(
      grievanceDbBackend({
        GRIEVANCE_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      timeDbBackend({
        TIME_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      attachmentsDbBackend({
        ATTACHMENTS_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      tasksDbBackend({
        TASKS_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      informalLogDbBackend({
        INFORMAL_LOG_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      minutesDbBackend({
        MINUTES_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      ledgerDbBackend({
        LEDGER_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      officersDbBackend({
        OFFICERS_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      travelDbBackend({
        TRAVEL_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      committeesDbBackend({
        COMMITTEES_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      electionsDbBackend({
        ELECTIONS_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
    expect(
      pollsDbBackend({
        POLLS_DB_BACKEND: "postgres",
        DATABASE_URL: "postgres://localhost/unionops",
      }),
    ).toBe("postgres");
  });

  it("reports memory inactive only when all backends are postgres", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
      ATTACHMENTS_DB_BACKEND: "postgres",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "postgres",
      INFORMAL_LOG_DB_BACKEND: "postgres",
      MINUTES_DB_BACKEND: "postgres",
      LEDGER_DB_BACKEND: "postgres",
      OFFICERS_DB_BACKEND: "postgres",
      TRAVEL_DB_BACKEND: "postgres",
      COMMITTEES_DB_BACKEND: "postgres",
      ELECTIONS_DB_BACKEND: "postgres",
      POLLS_DB_BACKEND: "postgres",
    };
    expect(auditDbBackend(env)).toBe("postgres");
    expect(timeDbBackend(env)).toBe("postgres");
    expect(attachmentsDbBackend(env)).toBe("postgres");
    expect(discussionsDbBackend(env)).toBe("postgres");
    expect(tasksDbBackend(env)).toBe("postgres");
    expect(informalLogDbBackend(env)).toBe("postgres");
    expect(minutesDbBackend(env)).toBe("postgres");
    expect(ledgerDbBackend(env)).toBe("postgres");
    expect(officersDbBackend(env)).toBe("postgres");
    expect(travelDbBackend(env)).toBe("postgres");
    expect(committeesDbBackend(env)).toBe("postgres");
    expect(electionsDbBackend(env)).toBe("postgres");
    expect(pollsDbBackend(env)).toBe("postgres");
    expect(isMemoryCaseDataActive(env)).toBe(false);
  });

  it("keeps memory active when time backend is still memory", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "memory",
      ATTACHMENTS_DB_BACKEND: "postgres",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "postgres",
      INFORMAL_LOG_DB_BACKEND: "postgres",
      MINUTES_DB_BACKEND: "postgres",
      LEDGER_DB_BACKEND: "postgres",
      OFFICERS_DB_BACKEND: "postgres",
      TRAVEL_DB_BACKEND: "postgres",
      COMMITTEES_DB_BACKEND: "postgres",
      ELECTIONS_DB_BACKEND: "postgres",
      POLLS_DB_BACKEND: "postgres",
    };
    expect(isMemoryCaseDataActive(env)).toBe(true);
  });

  it("keeps memory active when attachments backend is still memory", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
      ATTACHMENTS_DB_BACKEND: "memory",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "postgres",
      INFORMAL_LOG_DB_BACKEND: "postgres",
      MINUTES_DB_BACKEND: "postgres",
      LEDGER_DB_BACKEND: "postgres",
      OFFICERS_DB_BACKEND: "postgres",
      COMMITTEES_DB_BACKEND: "postgres",
      ELECTIONS_DB_BACKEND: "postgres",
      POLLS_DB_BACKEND: "postgres",
    };
    expect(isMemoryCaseDataActive(env)).toBe(true);
  });

  it("keeps memory active when tasks backend is still memory", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
      ATTACHMENTS_DB_BACKEND: "postgres",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "memory",
      INFORMAL_LOG_DB_BACKEND: "postgres",
      MINUTES_DB_BACKEND: "postgres",
      LEDGER_DB_BACKEND: "postgres",
      OFFICERS_DB_BACKEND: "postgres",
      COMMITTEES_DB_BACKEND: "postgres",
      ELECTIONS_DB_BACKEND: "postgres",
      POLLS_DB_BACKEND: "postgres",
    };
    expect(isMemoryCaseDataActive(env)).toBe(true);
  });

  it("keeps memory active when informal log backend is still memory", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
      ATTACHMENTS_DB_BACKEND: "postgres",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "postgres",
      INFORMAL_LOG_DB_BACKEND: "memory",
      MINUTES_DB_BACKEND: "postgres",
      LEDGER_DB_BACKEND: "postgres",
      OFFICERS_DB_BACKEND: "postgres",
      COMMITTEES_DB_BACKEND: "postgres",
      ELECTIONS_DB_BACKEND: "postgres",
      POLLS_DB_BACKEND: "postgres",
    };
    expect(isMemoryCaseDataActive(env)).toBe(true);
  });

  it("keeps memory active when minutes backend is still memory", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
      ATTACHMENTS_DB_BACKEND: "postgres",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "postgres",
      INFORMAL_LOG_DB_BACKEND: "postgres",
      MINUTES_DB_BACKEND: "memory",
      LEDGER_DB_BACKEND: "postgres",
      OFFICERS_DB_BACKEND: "postgres",
      COMMITTEES_DB_BACKEND: "postgres",
      ELECTIONS_DB_BACKEND: "postgres",
      POLLS_DB_BACKEND: "postgres",
    };
    expect(isMemoryCaseDataActive(env)).toBe(true);
  });

  it("keeps memory active when ledger backend is still memory", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
      ATTACHMENTS_DB_BACKEND: "postgres",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "postgres",
      INFORMAL_LOG_DB_BACKEND: "postgres",
      MINUTES_DB_BACKEND: "postgres",
      LEDGER_DB_BACKEND: "memory",
      OFFICERS_DB_BACKEND: "postgres",
      COMMITTEES_DB_BACKEND: "postgres",
      ELECTIONS_DB_BACKEND: "postgres",
      POLLS_DB_BACKEND: "postgres",
    };
    expect(isMemoryCaseDataActive(env)).toBe(true);
  });

  it("keeps memory active when officers backend is still memory", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
      ATTACHMENTS_DB_BACKEND: "postgres",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "postgres",
      INFORMAL_LOG_DB_BACKEND: "postgres",
      MINUTES_DB_BACKEND: "postgres",
      LEDGER_DB_BACKEND: "postgres",
      OFFICERS_DB_BACKEND: "memory",
      COMMITTEES_DB_BACKEND: "postgres",
      ELECTIONS_DB_BACKEND: "postgres",
      POLLS_DB_BACKEND: "postgres",
    };
    expect(isMemoryCaseDataActive(env)).toBe(true);
  });

  it("keeps memory active when committees backend is still memory", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
      ATTACHMENTS_DB_BACKEND: "postgres",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "postgres",
      INFORMAL_LOG_DB_BACKEND: "postgres",
      MINUTES_DB_BACKEND: "postgres",
      LEDGER_DB_BACKEND: "postgres",
      OFFICERS_DB_BACKEND: "postgres",
      TRAVEL_DB_BACKEND: "postgres",
      COMMITTEES_DB_BACKEND: "memory",
      ELECTIONS_DB_BACKEND: "postgres",
      POLLS_DB_BACKEND: "postgres",
    };
    expect(isMemoryCaseDataActive(env)).toBe(true);
  });

  it("keeps memory active when elections backend is still memory", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
      ATTACHMENTS_DB_BACKEND: "postgres",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "postgres",
      INFORMAL_LOG_DB_BACKEND: "postgres",
      MINUTES_DB_BACKEND: "postgres",
      LEDGER_DB_BACKEND: "postgres",
      OFFICERS_DB_BACKEND: "postgres",
      TRAVEL_DB_BACKEND: "postgres",
      COMMITTEES_DB_BACKEND: "postgres",
      ELECTIONS_DB_BACKEND: "memory",
      POLLS_DB_BACKEND: "postgres",
    };
    expect(isMemoryCaseDataActive(env)).toBe(true);
  });

  it("keeps memory active when polls backend is still memory", () => {
    const env = {
      DATABASE_URL: "postgres://localhost/unionops",
      GRIEVANCE_DB_BACKEND: "postgres",
      BUMPING_DB_BACKEND: "postgres",
      AUDIT_DB_BACKEND: "postgres",
      TIME_DB_BACKEND: "postgres",
      ATTACHMENTS_DB_BACKEND: "postgres",
      DISCUSSIONS_DB_BACKEND: "postgres",
      TASKS_DB_BACKEND: "postgres",
      INFORMAL_LOG_DB_BACKEND: "postgres",
      MINUTES_DB_BACKEND: "postgres",
      LEDGER_DB_BACKEND: "postgres",
      OFFICERS_DB_BACKEND: "postgres",
      TRAVEL_DB_BACKEND: "postgres",
      COMMITTEES_DB_BACKEND: "postgres",
      ELECTIONS_DB_BACKEND: "postgres",
      POLLS_DB_BACKEND: "memory",
    };
    expect(isMemoryCaseDataActive(env)).toBe(true);
  });
});
