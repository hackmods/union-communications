import { describe, expect, it } from "vitest";
import {
  parseSnippetBulk,
  parseSnippetCsv,
  parseSnippetText,
} from "./bulk-parse";

describe("parseSnippetCsv", () => {
  it("parses clauseRef/title/body/tags with pipe-separated tags", () => {
    const csv = [
      "clauseRef,title,body,tags",
      'Article 7.01,Just cause,"No discipline without cause.",discipline|just-cause',
      "Article 6.03,Representation,Union rep at discipline meetings.,representation;discipline",
    ].join("\n");

    const rows = parseSnippetCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      clauseRef: "Article 7.01",
      title: "Just cause",
      body: "No discipline without cause.",
      tags: ["discipline", "just-cause"],
    });
    expect(rows[1].tags).toEqual(["representation", "discipline"]);
  });

  it("accepts clause_ref header aliases and skips incomplete rows", () => {
    const csv = [
      "clause_ref,title,body,tags",
      "Art. 1,Ok,Body text,",
      "Art. 2,,Missing title,",
      ",No clause,Body,",
    ].join("\n");
    const rows = parseSnippetCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].clauseRef).toBe("Art. 1");
  });

  it("returns empty when required headers are missing", () => {
    expect(parseSnippetCsv("a,b\n1,2")).toEqual([]);
  });
});

describe("parseSnippetText", () => {
  it("parses Article | Title blocks separated by blank lines", () => {
    const text = [
      "Article 7.01 | Just cause for discipline",
      "No employee shall be disciplined without just cause.",
      "Written reasons on request.",
      "",
      "Article 6.03 | Representation right",
      "Entitled to union representation.",
    ].join("\n");

    const rows = parseSnippetText(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      clauseRef: "Article 7.01",
      title: "Just cause for discipline",
      body: "No employee shall be disciplined without just cause.\nWritten reasons on request.",
      tags: [],
    });
    expect(rows[1].clauseRef).toBe("Article 6.03");
  });

  it("skips blocks without a pipe header or body", () => {
    const text = [
      "No pipe here",
      "Some body",
      "",
      "Article 1 | Title only",
      "",
      "Art. 2 | Ok",
      "Body present",
    ].join("\n");
    expect(parseSnippetText(text)).toEqual([
      {
        clauseRef: "Art. 2",
        title: "Ok",
        body: "Body present",
        tags: [],
      },
    ]);
  });
});

describe("parseSnippetBulk", () => {
  it("dispatches by format", () => {
    expect(
      parseSnippetBulk(
        "csv",
        "clauseRef,title,body\nA.1,T,B",
      ),
    ).toHaveLength(1);
    expect(
      parseSnippetBulk("text", "A.1 | T\nB"),
    ).toHaveLength(1);
  });
});
