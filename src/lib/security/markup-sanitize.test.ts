import { describe, expect, it } from "vitest";
import {
  removeScriptBlocksFromHtml,
  scrubXmlMarkupForParsing,
  stripHtmlTags,
} from "./markup-sanitize";

describe("markup-sanitize", () => {
  it("strips nested-looking tag sequences iteratively", () => {
    expect(stripHtmlTags("<b><i>Title</i></b>")).toBe("Title");
  });

  it("removes script blocks including nested markup", () => {
    const html = "<p>Hi</p><script>alert(1)</script><script>x</script>";
    expect(removeScriptBlocksFromHtml(html)).toBe("<p>Hi</p>");
  });

  it("scrubs XML comments and processing instructions", () => {
    const xml = "<!-- a --> <?xml-stylesheet href='x'?> <root/>";
    expect(scrubXmlMarkupForParsing(xml)).toBe("  <root/>");
  });
});
