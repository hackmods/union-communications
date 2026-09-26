import { minutesDbBackend } from "@/lib/db/backend";
import { unionExists } from "@/lib/tenant/union-exists";

/** Minimal session shape — avoids pulling next-auth into unit tests. */
export type MinutesWriteSession = {
  user: {
    id: string;
    unionId?: string | null;
    localId?: string | null;
  };
};

export type MinutesWriteTenant =
  | { ok: true; unionId: string; localId: string }
  | { ok: false; status: 400; error: string };

function memoryTenantIds(session: MinutesWriteSession) {
  const unionId = session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId = session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}

/**
 * Resolve tenant ids for minutes create/update when lasting storage is on.
 * Memory mode keeps the solo-* fallback for workshop demos.
 * Postgres mode requires a real session union that exists in `unions`.
 */
export async function resolveMinutesWriteTenant(
  session: MinutesWriteSession,
): Promise<MinutesWriteTenant> {
  if (minutesDbBackend() !== "postgres") {
    return { ok: true, ...memoryTenantIds(session) };
  }

  const unionId = session.user.unionId?.trim();
  if (!unionId || unionId.startsWith("solo-union-")) {
    return {
      ok: false,
      status: 400,
      error:
        "No union context — assign a local or re-login after seed before saving minutes.",
    };
  }

  if (!(await unionExists(unionId))) {
    return {
      ok: false,
      status: 400,
      error:
        "Union is missing from lasting storage — run db:seed or recreate the union, then re-login.",
    };
  }

  const localId =
    session.user.localId?.trim() || `solo-local-${session.user.id}`;
  return { ok: true, unionId, localId };
}
