"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  addHybridBumpingNote,
  addHybridBumpingSession,
  addHybridGrievanceNote,
  createHybridBumpingCase,
  createHybridGrievance,
  getHybridBumpingCase,
  getHybridGrievance,
  listHybridBumpingCases,
  listHybridGrievances,
  resolveHybridCaseSource,
  setHybridBumpingDecision,
  updateHybridBumpingCase,
  updateHybridGrievance,
  type HybridCaseSource,
} from "@/lib/hybrid/case-client";
import {
  hybridLocalSliceAdapter,
  type HybridDataMode,
} from "@/lib/hybrid/local-slice-adapter";
import type { HybridActorContext } from "@/lib/hybrid/local-case-store";
import {
  isLiveHybridUnlocked,
  subscribeLiveHybridSession,
} from "@/lib/hybrid/live-session";
import type {
  CreateBumpingCaseInput,
  CreateDecisionInput,
  CreateNoteInput as CreateBumpingNoteInput,
  CreateSessionInput,
  UpdateBumpingCaseInput,
} from "@/types/bumping";
import type {
  CreateGrievanceInput,
  CreateNoteInput,
  UpdateGrievanceInput,
} from "@/types/grievance";

/**
 * Client branch for grievance/bumping when HybridDataMode is local and the
 * tab has an unlocked decrypted slice. Hub API otherwise.
 */
export function useHybridCaseStore() {
  const { data: session } = useSession();
  const [mode, setMode] = useState<HybridDataMode>("central");
  const [unlocked, setUnlocked] = useState(false);
  const [source, setSource] = useState<HybridCaseSource>("central");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      const nextMode = await hybridLocalSliceAdapter.getDataMode();
      const nextSource = await resolveHybridCaseSource();
      if (cancelled) return;
      setMode(nextMode);
      setUnlocked(isLiveHybridUnlocked());
      setSource(nextSource);
      setRevision((n) => n + 1);
    };

    void pull();
    const unsubscribe = subscribeLiveHybridSession(() => {
      void pull();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const actor = useCallback((): HybridActorContext | null => {
    const user = session?.user;
    if (!user?.id) return null;
    return {
      unionId: user.unionId ?? `solo-union-${user.id}`,
      localId: user.localId ?? `solo-local-${user.id}`,
      userId: user.id,
      authorName: user.name?.trim() || user.email || "Local officer",
    };
  }, [session]);

  return {
    mode,
    unlocked,
    source,
    revision,
    isLiveLocal: source === "local",
    needsUnlock: source === "locked",
    actor,
    listGrievances: listHybridGrievances,
    getGrievance: getHybridGrievance,
    createGrievance: async (input: CreateGrievanceInput) => {
      const ctx = actor();
      if (!ctx) throw new Error("Not signed in");
      return createHybridGrievance(input, ctx);
    },
    updateGrievance: (id: string, input: UpdateGrievanceInput) =>
      updateHybridGrievance(id, input),
    addGrievanceNote: async (id: string, input: CreateNoteInput) => {
      const ctx = actor();
      if (!ctx) throw new Error("Not signed in");
      return addHybridGrievanceNote(id, input, ctx);
    },
    listBumpingCases: listHybridBumpingCases,
    getBumpingCase: getHybridBumpingCase,
    createBumpingCase: async (input: CreateBumpingCaseInput) => {
      const ctx = actor();
      if (!ctx) throw new Error("Not signed in");
      return createHybridBumpingCase(input, ctx);
    },
    updateBumpingCase: (id: string, input: UpdateBumpingCaseInput) =>
      updateHybridBumpingCase(id, input),
    addBumpingNote: async (id: string, input: CreateBumpingNoteInput) => {
      const ctx = actor();
      if (!ctx) throw new Error("Not signed in");
      return addHybridBumpingNote(id, input, ctx);
    },
    addBumpingSession: async (id: string, input: CreateSessionInput) => {
      const ctx = actor();
      if (!ctx) throw new Error("Not signed in");
      return addHybridBumpingSession(id, input, ctx);
    },
    setBumpingDecision: async (id: string, input: CreateDecisionInput) => {
      const ctx = actor();
      if (!ctx) throw new Error("Not signed in");
      return setHybridBumpingDecision(id, input, ctx);
    },
  };
}
