/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import {
  decryptJson,
  encryptJson,
  isEncryptedPayload,
} from "@/lib/crypto/passphrase";
import {
  decryptHybridFile,
  encryptHybridSlice,
  isEncryptedHybridFile,
} from "@/lib/hybrid/encrypt";
import {
  assertSliceTenantScope,
  buildHybridSlice,
  isHybridDataSlice,
} from "@/lib/hybrid/slice";
import type { GrievanceWithRelations } from "@/types/grievance";

const sampleGrievance: GrievanceWithRelations = {
  grievance: {
    id: "grev-test",
    unionId: "union-opseu",
    localId: "local-243",
    category: "Discipline",
    status: "open",
    currentStep: 1,
    filedAt: "2026-01-01T00:00:00.000Z",
    assignedStewardId: "user-steward-243",
    createdById: "user-president-243",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  events: [
    {
      id: "evt-1",
      grievanceId: "grev-test",
      type: "step_filed",
      stepNumber: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  notes: [],
};

describe("passphrase encryption", () => {
  it("round-trips JSON with a passphrase", async () => {
    const payload = await encryptJson({ hello: "world" }, "test-pass-99");
    expect(isEncryptedPayload(payload)).toBe(true);
    const decrypted = await decryptJson<{ hello: string }>(
      payload,
      "test-pass-99",
    );
    expect(decrypted).toEqual({ hello: "world" });
  });

  it("rejects short passphrases", async () => {
    await expect(encryptJson({ a: 1 }, "short")).rejects.toThrow(/8/);
  });

  it("fails on wrong passphrase", async () => {
    const payload = await encryptJson({ secret: true }, "correct-passphrase");
    await expect(decryptJson(payload, "wrong-passphrase")).rejects.toThrow(
      /wrong passphrase|Decryption failed/i,
    );
  });
});

describe("hybrid slice", () => {
  it("builds and validates a slice", () => {
    const slice = buildHybridSlice({
      unionId: "union-opseu",
      localId: "local-243",
      grievances: [sampleGrievance],
      bumpingCases: [],
    });
    expect(isHybridDataSlice(slice)).toBe(true);
    expect(slice.grievances).toHaveLength(1);
    expect(() =>
      assertSliceTenantScope(slice, "union-opseu", "local-243"),
    ).not.toThrow();
  });

  it("rejects cross-tenant rows", () => {
    const slice = buildHybridSlice({
      unionId: "union-opseu",
      localId: "local-243",
      grievances: [
        {
          ...sampleGrievance,
          grievance: {
            ...sampleGrievance.grievance,
            unionId: "other-union",
          },
        },
      ],
      bumpingCases: [],
    });
    expect(() =>
      assertSliceTenantScope(slice, "union-opseu", "local-243"),
    ).toThrow(/another tenant/i);
  });

  it("encrypts and decrypts a hybrid file", async () => {
    const slice = buildHybridSlice({
      unionId: "union-opseu",
      localId: "local-243",
      grievances: [sampleGrievance],
      bumpingCases: [],
    });
    const file = await encryptHybridSlice(slice, "hybrid-pass-123");
    expect(isEncryptedHybridFile(file)).toBe(true);
    expect(file.format).toBe("lunion-hybrid-v1");
    const restored = await decryptHybridFile(file, "hybrid-pass-123");
    expect(restored.grievances[0].grievance.id).toBe("grev-test");
    expect(restored.unionId).toBe("union-opseu");
  });
});
