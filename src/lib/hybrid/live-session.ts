/**
 * Tab-lifetime decrypted hybrid slice. Passphrase stays in module memory only —
 * never sent to the server. Cleared on mode switch to central / explicit clear.
 *
 * Server adapters must not read this; client pages branch when live-local is active.
 */

import { encryptHybridSlice } from "./encrypt";
import { hybridLocalSliceAdapter } from "./local-slice-adapter";
import type { HybridDataSlice } from "./types";

type LiveSession = {
  slice: HybridDataSlice;
  passphrase: string;
};

let session: LiveSession | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function isLiveHybridUnlocked(): boolean {
  return session !== null;
}

export function getLiveHybridSlice(): HybridDataSlice | null {
  return session?.slice ?? null;
}

/** Snapshot for tests / sync — do not mutate. */
export function peekLiveHybridPassphrase(): string | null {
  return session?.passphrase ?? null;
}

export function unlockLiveHybridSession(
  slice: HybridDataSlice,
  passphrase: string,
): void {
  if (passphrase.length < 8) {
    throw new Error("Passphrase must be at least 8 characters");
  }
  session = {
    slice: structuredClone(slice),
    passphrase,
  };
  notify();
}

export function clearLiveHybridSession(): void {
  if (!session) return;
  session = null;
  notify();
}

/**
 * Apply a mutator to the in-memory slice, bump exportedAt, re-encrypt to
 * localStorage, and notify subscribers.
 */
export async function mutateLiveHybridSlice(
  mutator: (draft: HybridDataSlice) => void,
): Promise<HybridDataSlice> {
  if (!session) {
    throw new Error("Hybrid live session is not unlocked");
  }
  const draft = structuredClone(session.slice);
  mutator(draft);
  draft.exportedAt = new Date().toISOString();
  const encrypted = await encryptHybridSlice(draft, session.passphrase);
  await hybridLocalSliceAdapter.saveEncryptedSlice(encrypted);
  session = { slice: draft, passphrase: session.passphrase };
  notify();
  return draft;
}

export function replaceLiveHybridSlice(slice: HybridDataSlice): void {
  if (!session) {
    throw new Error("Hybrid live session is not unlocked");
  }
  session = {
    slice: structuredClone(slice),
    passphrase: session.passphrase,
  };
  notify();
}

export function subscribeLiveHybridSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper — clears session without notifying (tests re-subscribe). */
export function resetLiveHybridSessionForTests(): void {
  session = null;
  listeners.clear();
}
