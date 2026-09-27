import { describe, expect, it } from "vitest";
import { sanitizeSvgBytes, validateAttachmentBytes } from "./file-validation";

describe("document byte signatures", () => {
  it("accepts a declared PDF with a PDF signature", () => {
    expect(validateAttachmentBytes("application/pdf", Buffer.from("%PDF-1.7"))).toBeNull();
  });

  it("rejects disguised MIME types and unsupported executable payloads", () => {
    expect(validateAttachmentBytes("application/pdf", Buffer.from("MZ\x90\x00"))).toMatch(/do not match/i);
    expect(validateAttachmentBytes("application/x-msdownload", Buffer.from("MZ\x90\x00"))).toBe("Unsupported file type");
  });

  it("rebuilds SVGs from safe vector primitives and strips active or external content", () => {
    const source = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" width="20" height="20"><script>alert(1)</script><foreignObject><p>bad</p></foreignObject><image href="https://evil.example/x.png"/><style>*{fill:url(https://evil.example)}</style><path d="M0 0L10 10" fill="#123456" onclick="alert(1)"/></svg>`);
    const sanitized = sanitizeSvgBytes(source);
    const value = sanitized.toString("utf8");
    expect(value).toContain("<path");
    expect(value).not.toMatch(/script|foreignObject|image|style|onload|onclick|evil\.example/i);
    expect(validateAttachmentBytes("image/svg+xml", sanitized)).toBeNull();
  });

  it("rejects SVG entity declarations and oversized input before parsing", () => {
    expect(() => sanitizeSvgBytes(Buffer.from(`<!DOCTYPE svg [<!ENTITY x "boom">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>`))).toThrow(/entities/i);
    expect(() => sanitizeSvgBytes(Buffer.alloc(1024 * 1024 + 1, 0x20))).toThrow(/1 MB/i);
  });
});
