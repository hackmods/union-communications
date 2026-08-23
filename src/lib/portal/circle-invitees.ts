import { DEMO_USERS } from "@/lib/auth/demo-users";
import { isDemoAuthEnabled } from "@/lib/auth/demo-auth-gate";
import { listInvitedUsersForUnion } from "@/lib/auth/invites";
import { listMentionableHubUsers } from "@/lib/hub/mentionables";

export type CircleInviteCandidate = {
  id: string;
  name: string;
};

/** Whole-union invite list so a caucus Circle can include other locals. */
export async function listCircleInviteCandidates(
  unionId: string,
): Promise<CircleInviteCandidate[]> {
  const byId = new Map<string, CircleInviteCandidate>();

  if (isDemoAuthEnabled()) {
    for (const user of DEMO_USERS) {
      if (user.unionId === unionId) {
        byId.set(user.id, { id: user.id, name: user.name });
      }
    }
  }

  for (const user of await listMentionableHubUsers({ unionId })) {
    byId.set(user.id, { id: user.id, name: user.name });
  }

  for (const user of listInvitedUsersForUnion(unionId)) {
    byId.set(user.id, { id: user.id, name: user.name });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
