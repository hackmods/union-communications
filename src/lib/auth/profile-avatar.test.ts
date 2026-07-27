import { afterEach, describe, expect, it } from "vitest";
import {
  __resetMemoryProfileAvatarsForTests,
  clearProfileAvatar,
  getProfileAvatar,
  setProfileAvatar,
  validateProfileAvatarInput,
} from "@/lib/auth/profile-avatar";

afterEach(() => {
  __resetMemoryProfileAvatarsForTests();
});

describe("validateProfileAvatarInput", () => {
  it("accepts jpeg/png/webp base64 payloads", () => {
    expect(
      validateProfileAvatarInput({
        mimeType: "image/jpeg",
        contentBase64: "abc123",
      }),
    ).toBeNull();
  });

  it("rejects unsupported mime types", () => {
    expect(
      validateProfileAvatarInput({
        mimeType: "image/svg+xml",
        contentBase64: "abc",
      }),
    ).toMatch(/JPEG/);
  });

  it("rejects empty content", () => {
    expect(
      validateProfileAvatarInput({
        mimeType: "image/png",
        contentBase64: "   ",
      }),
    ).toMatch(/required/i);
  });
});

describe("memory profile avatar store", () => {
  it("saves and clears avatars when postgres backend is off", async () => {
    const saved = await setProfileAvatar("user-1", {
      mimeType: "image/png",
      contentBase64: "dGVzdA==",
    });
    expect(saved.error).toBeUndefined();
    expect(saved.avatar?.mimeType).toBe("image/png");

    const loaded = await getProfileAvatar("user-1");
    expect(loaded?.contentBase64).toBe("dGVzdA==");

    await clearProfileAvatar("user-1");
    expect(await getProfileAvatar("user-1")).toBeNull();
  });
});
