/**
 * Preferred CA library per local (+ optional bargaining unit).
 * Brand Kit / collection changes update preference only — never wipe customs.
 */

import {
  defaultLibraryForBargainingUnitCode,
  isSnippetLibraryId,
  type SnippetLibraryId,
} from "./libraries";

type PrefKey = string;

const prefs = new Map<PrefKey, SnippetLibraryId>();

function key(
  unionId: string,
  localId: string,
  bargainingUnitId?: string | null,
): PrefKey {
  return `${unionId}::${localId}::${bargainingUnitId ?? "*"}`;
}

export function getPreferredSnippetLibrary(
  unionId: string,
  localId: string | null | undefined,
  bargainingUnitId?: string | null,
): SnippetLibraryId | null {
  if (!localId) return null;
  const exact = prefs.get(key(unionId, localId, bargainingUnitId));
  if (exact) return exact;
  return prefs.get(key(unionId, localId, null)) ?? null;
}

export function setPreferredSnippetLibrary(
  unionId: string,
  localId: string,
  libraryId: SnippetLibraryId,
  bargainingUnitId?: string | null,
): SnippetLibraryId {
  prefs.set(key(unionId, localId, bargainingUnitId), libraryId);
  // Also refresh the local-wide default so list UI has a fallback.
  if (bargainingUnitId) {
    prefs.set(key(unionId, localId, null), libraryId);
  }
  return libraryId;
}

/** Derive + persist preference from a Hub / Brand Kit collection code. */
export function syncPreferredLibraryFromCollectionCode(
  unionId: string,
  localId: string,
  collectionCode: string | null | undefined,
  bargainingUnitId?: string | null,
): SnippetLibraryId {
  const libraryId = defaultLibraryForBargainingUnitCode(collectionCode);
  return setPreferredSnippetLibrary(
    unionId,
    localId,
    libraryId,
    bargainingUnitId,
  );
}

export function resolvePreferredOrDefaultLibrary(input: {
  unionId: string;
  localId?: string | null;
  bargainingUnitId?: string | null;
  collectionCode?: string | null;
  explicit?: string | null;
}): SnippetLibraryId {
  if (isSnippetLibraryId(input.explicit)) return input.explicit;
  const stored = getPreferredSnippetLibrary(
    input.unionId,
    input.localId,
    input.bargainingUnitId,
  );
  if (stored) return stored;
  return defaultLibraryForBargainingUnitCode(input.collectionCode);
}

/** @internal test helper */
export function resetPreferredSnippetLibrariesForTests(): void {
  prefs.clear();
}
