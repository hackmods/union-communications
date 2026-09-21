import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { UserRole } from "@/types/tenant";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { listFiltersForElectionsSession } from "@/lib/auth/elections-session";
import { listFiltersForCheckinsSession } from "@/lib/auth/checkins-session";
import { listFiltersForDiscussionsSession } from "@/lib/auth/discussions-session";
import { listFiltersForInformalLogSession } from "@/lib/auth/informal-log-session";
import { listFiltersForExpenseSession } from "@/lib/auth/expenses-session";
import { listFiltersForPollsSession } from "@/lib/auth/polls-session";
import { listFiltersForLedgerSession } from "@/lib/auth/ledger-session";
import { listFiltersForMinutesSession } from "@/lib/auth/minutes-session";
import { listFiltersForTravelSession } from "@/lib/auth/travel-session";
import { listFiltersForTaskSession } from "@/lib/auth/task-session";
import { listFiltersForCommitteesSession } from "@/lib/auth/committees-session";
import { listFiltersForBumpingSession } from "@/lib/auth/bumping-session";
import { listFiltersForTimeSession } from "@/lib/auth/time-session";
import { canViewElectionCycle } from "@/lib/elections/access";
import { canViewCheckinSchedule } from "@/lib/checkins/access";
import { canViewDiscussionThreadBase } from "@/lib/discussions/access";
import { canViewExpenseSubmission } from "@/lib/expenses/access";
import { canViewInformalLogEntry } from "@/lib/informal-log/access";
import { canViewPoll } from "@/lib/polls/access";
import { canViewLedgerEntry } from "@/lib/ledger/access";
import { canViewMinutes } from "@/lib/minutes/access";
import { canViewTravelAuth } from "@/lib/travel/access";
import { canViewTask } from "@/lib/tasks/access";
import { canViewCommittee } from "@/lib/committees/access";
import { canViewOfficerRosterEntry } from "@/lib/officers/access";
import { canViewMeetingSchedule, canViewUnionMeeting } from "@/lib/meetings/access";
import { canViewBumpingCase } from "@/lib/bumping/access";
import { canViewPtoRequest, canViewTimeEntry, canViewTimeShift } from "@/lib/time/access";

const deniedLocal = "__no_local_context__";

function session(roles: UserRole[] = ["local_president"]): Session {
  return {
    user: {
      id: "actor-1",
      unionId: "union-1",
      localId: undefined,
      bargainingUnitId: "unit-1",
      roles,
    },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

describe("missing local scope is fail-closed", () => {
  it("uses an unmatched local filter unless cross-local authority is explicit", () => {
    const actor = session();
    expect(listFiltersForElectionsSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForCheckinsSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForDiscussionsSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForInformalLogSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForExpenseSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForPollsSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForLedgerSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForMinutesSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForTravelSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForTaskSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForCommitteesSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForBumpingSession(actor).localId).toBe(deniedLocal);
    expect(listFiltersForTimeSession(actor).localId).toBe(deniedLocal);

    expect(listFiltersForElectionsSession(session(["union_admin"])).localId).toBeUndefined();
    expect(listFiltersForLedgerSession(session(["division_admin"])).localId).toBeUndefined();
  });

  it("denies unrelated local records but preserves explicit owners and cross-local roles", () => {
    const localPresident: UserRole[] = ["local_president"];
    const unionAdmin: UserRole[] = ["union_admin"];
    const record = { unionId: "union-1", localId: "local-2" };

    expect(canViewElectionCycle({ ...record } as never, "union-1", undefined, localPresident)).toBe(false);
    expect(canViewElectionCycle({ ...record } as never, "union-1", undefined, unionAdmin)).toBe(true);
    expect(canViewCheckinSchedule({ ...record, createdById: "someone-else" } as never, "actor-1", "union-1", undefined, localPresident)).toBe(false);
    expect(canViewCheckinSchedule({ ...record, createdById: "actor-1" } as never, "actor-1", "union-1", undefined, localPresident)).toBe(false);
    expect(canViewDiscussionThreadBase({ ...record, createdById: "someone-else" } as never, "actor-1", "union-1", undefined, localPresident)).toBe(false);
    expect(canViewDiscussionThreadBase({ ...record, createdById: "actor-1" } as never, "actor-1", "union-1", undefined, localPresident)).toBe(false);
    expect(canViewExpenseSubmission({ ...record, submittedById: "someone-else" } as never, "union-1", undefined, "actor-1", localPresident)).toBe(false);
    expect(canViewExpenseSubmission({ ...record, submittedById: "actor-1" } as never, "union-1", undefined, "actor-1", localPresident)).toBe(true);
    expect(canViewInformalLogEntry(record as never, "union-1", undefined, localPresident)).toBe(false);
    expect(canViewInformalLogEntry(record as never, "union-1", undefined, unionAdmin)).toBe(true);
    expect(canViewPoll(record as never, "union-1", undefined, localPresident)).toBe(false);
    expect(canViewPoll(record as never, "union-1", undefined, unionAdmin)).toBe(true);
    expect(canViewLedgerEntry(record as never, "union-1", undefined, localPresident)).toBe(false);
    expect(canViewLedgerEntry(record as never, "union-1", undefined, unionAdmin)).toBe(true);
    expect(canViewMinutes(record as never, "union-1", undefined, localPresident)).toBe(false);
    expect(canViewMinutes(record as never, "union-1", undefined, unionAdmin)).toBe(true);
    expect(canViewTravelAuth({ ...record, requestedById: "someone-else" } as never, "union-1", undefined, "actor-1", localPresident)).toBe(false);
    expect(canViewTravelAuth({ ...record, requestedById: "actor-1" } as never, "union-1", undefined, "actor-1", localPresident)).toBe(true);
    expect(canViewTask({ ...record, assigneeId: "someone-else", createdById: "someone-else" } as never, "actor-1", "union-1", undefined, localPresident)).toBe(false);
    expect(canViewTask({ ...record, assigneeId: "actor-1", createdById: "someone-else" } as never, "actor-1", "union-1", undefined, localPresident)).toBe(true);
    expect(canViewCommittee(record as never, "union-1", undefined, localPresident)).toBe(false);
    expect(canViewOfficerRosterEntry(record as never, "union-1", undefined, localPresident)).toBe(false);
    expect(canViewMeetingSchedule(record as never, "union-1", undefined, localPresident)).toBe(false);
    expect(canViewUnionMeeting(record as never, "union-1", undefined, localPresident)).toBe(false);
    expect(canViewBumpingCase(record as never, "union-1", undefined, localPresident)).toBe(false);
    expect(canViewTimeEntry({ ...record, workerId: "someone-else" } as never, "actor-1", "union-1", undefined, localPresident)).toBe(false);
    expect(canViewTimeEntry({ ...record, workerId: "actor-1" } as never, "actor-1", "union-1", undefined, localPresident)).toBe(true);
    expect(canViewPtoRequest({ ...record, workerId: "someone-else", requestedById: "someone-else" } as never, "actor-1", "union-1", undefined, localPresident)).toBe(false);
    expect(canViewPtoRequest({ ...record, workerId: "actor-1", requestedById: "someone-else" } as never, "actor-1", "union-1", undefined, localPresident)).toBe(true);
    expect(canViewTimeShift({ ...record, status: "published", assignedWorkerIds: ["someone-else"] } as never, "actor-1", "union-1", undefined, localPresident)).toBe(false);
    expect(canViewTimeShift({ ...record, status: "published", assignedWorkerIds: ["actor-1"] } as never, "actor-1", "union-1", undefined, localPresident)).toBe(true);
  });
});
