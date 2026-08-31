import { describe, expect, it } from "vitest";
import {
  changedBylawRedlineCount,
  parseBylawArticles,
  summarizeBylawRedline,
} from "./redline";

describe("parseBylawArticles", () => {
  it("splits numbered articles", () => {
    const text = `Article 1: Name. Local 243.

Article 2: Purpose. Advance members.`;

    const slices = parseBylawArticles(text);
    expect(slices).toHaveLength(2);
    expect(slices[0]?.key).toBe("name");
    expect(slices[1]?.key).toBe("purpose");
  });
});

describe("summarizeBylawRedline", () => {
  it("flags changed articles", () => {
    const existing = `Article 6: Quorum. GMM quorum shall be 20 members.`;
    const draft = `Article 6: Quorum. GMM quorum shall be 25 members or 10%.`;
    const rows = summarizeBylawRedline(existing, draft);
    expect(changedBylawRedlineCount(rows)).toBe(1);
    expect(rows[0]?.status).toBe("changed");
  });
});
