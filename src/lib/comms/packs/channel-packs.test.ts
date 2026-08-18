import { describe, expect, it } from "vitest";
import { COMMS_CHANNEL_PACKS } from "@/lib/comms/packs/channel-packs";

describe("channel-packs", () => {
  it("lists print, social, board, and wallet packs", () => {
    expect(Object.keys(COMMS_CHANNEL_PACKS)).toEqual([
      "print",
      "social",
      "board",
      "wallet",
    ]);
    expect(COMMS_CHANNEL_PACKS.social.tools).toContain("graphic-maker");
    expect(COMMS_CHANNEL_PACKS.social.tools).not.toContain("share-kit");
    expect(COMMS_CHANNEL_PACKS.print.tools).toContain("flyer-maker");
    expect(COMMS_CHANNEL_PACKS.wallet.tools).toContain("action-card");
  });
});
