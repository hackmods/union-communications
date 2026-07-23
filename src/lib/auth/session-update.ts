/**
 * Trusted JWT session updates (SEC-001 / SEC-005).
 * Client session.update() payloads are never trusted for mfaVerified or
 * arbitrary tenant claims — only grant nonces and validated context switches.
 */

import type { JWT } from "next-auth/jwt";
import { consumeMfaGrant } from "@/lib/auth/mfa-grants";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import { listBargainingUnitsForLocal } from "@/lib/tenant/loader";
import type { UserRole } from "@/types/tenant";

/** Shape of data the client may pass to session.update(). */
export interface SessionUpdateInput {
  mfaVerified?: unknown;
  mfaGrant?: unknown;
  localId?: unknown;
  bargainingUnitId?: unknown;
}

export function validateBargainingUnitForLocal(
  bargainingUnitId: string | undefined,
  localId: string | undefined,
  unionId: string | undefined,
): string | undefined {
  if (!bargainingUnitId) return undefined;
  if (!localId || !unionId) return undefined;
  const units = listBargainingUnitsForLocal(unionId, localId);
  return units.some((u) => u.id === bargainingUnitId)
    ? bargainingUnitId
    : undefined;
}

export function applyTrustedSessionUpdate(
  token: JWT,
  session: SessionUpdateInput,
  now = Date.now(),
): JWT {
  // mfaVerified is NEVER settable directly from client input.
  if (typeof session.mfaGrant === "string" && token.sub) {
    if (consumeMfaGrant(token.sub, session.mfaGrant, now)) {
      token.mfaVerified = true;
    }
  }

  const roles = (token.roles as UserRole[] | undefined) ?? [];
  const accessible =
    (token.accessibleLocalIds as string[] | undefined) ?? [];
  const canCrossLocal = canCrossLocalGrievance(roles);

  let localTouched = false;
  if ("localId" in session) {
    localTouched = true;
    const requested =
      session.localId === undefined || session.localId === null
        ? undefined
        : String(session.localId);

    if (requested === undefined) {
      // Clearing scope ("all locals") only for elevated cross-local roles.
      if (canCrossLocal) {
        token.localId = undefined;
      }
    } else {
      const allowed = accessible.includes(requested) || canCrossLocal;
      if (allowed) {
        token.localId = requested;
      }
    }
  }

  if ("bargainingUnitId" in session || localTouched) {
    const requestedBu =
      "bargainingUnitId" in session
        ? session.bargainingUnitId === undefined ||
          session.bargainingUnitId === null ||
          session.bargainingUnitId === ""
          ? undefined
          : String(session.bargainingUnitId)
        : (token.bargainingUnitId as string | undefined);

    token.bargainingUnitId = validateBargainingUnitForLocal(
      requestedBu,
      token.localId as string | undefined,
      token.unionId as string | undefined,
    );
  }

  return token;
}
