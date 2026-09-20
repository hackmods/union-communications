import { describe, expect, it } from "vitest";
import { extractMentionedUserIds, segmentMentionText } from "@/lib/hub/mentions";
import { toggleHubReaction } from "@/lib/hub/reactions";

const roster = [
  { id: "user-president-7", name: "Local 7 President" },
  { id: "user-steward-7", name: "Local 7 Steward (FT)" },
];

describe("hub mentions", () => {
  it("extracts @[id] mentions", () => {
    expect(
      extractMentionedUserIds(
        "Ping @[user-steward-7] on this",
        roster,
      ),
    ).toEqual(["user-steward-7"]);
  });

  it("extracts display-name mentions", () => {
    expect(
      extractMentionedUserIds(
        "Thanks @Local 7 President for the update.",
        roster,
      ),
    ).toEqual(["user-president-7"]);
  });

  it("segments mention text safely", () => {
    expect(
      segmentMentionText("Hi @Local 7 President — done.", roster),
    ).toEqual([
      { type: "text", value: "Hi " },
      {
        type: "mention",
        value: "@Local 7 President",
        userId: "user-president-7",
      },
      { type: "text", value: " — done." },
    ]);
  });
});

describe("hub reactions", () => {
  it("toggles reactions per user/kind", () => {
    const first = toggleHubReaction([], "solidarity", "u1");
    expect(first).toEqual([{ kind: "solidarity", userId: "u1" }]);
    const second = toggleHubReaction(first, "solidarity", "u1");
    expect(second).toEqual([]);
  });
});
