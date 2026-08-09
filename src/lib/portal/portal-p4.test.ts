import { describe, expect, it } from "vitest";
import {
  parseBasecampCsv,
  splitCsvLine,
} from "@/lib/portal/basecamp-import";
import { resolveMentions } from "@/lib/portal/mentions";

describe("parseBasecampCsv", () => {
  it("maps message/todo/document aliases", () => {
    const rows = parseBasecampCsv(
      "type,title,body\nmessage,Hello,\"Hi, all\"\ntodo,Task,Notes\ndocument,Doc,Link\n",
    );
    expect(rows).toEqual([
      { kind: "bulletin", title: "Hello", body: "Hi, all" },
      { kind: "action", title: "Task", body: "Notes" },
      { kind: "binder", title: "Doc", body: "Link" },
    ]);
  });

  it("splits quoted commas", () => {
    expect(splitCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });
});

describe("resolveMentions", () => {
  it("matches roster display names", () => {
    const hits = resolveMentions(
      "Ping @Local 243 Member please",
      [
        { userId: "u1", userName: "Local 243 Member" },
        { userId: "u2", userName: "Local 243 President" },
      ],
      "u2",
    );
    expect(hits).toEqual([{ userId: "u1", userName: "Local 243 Member" }]);
  });
});
