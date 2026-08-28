import { describe, expect, it } from "vitest";
import {
  collectOfficeEmbedTtfFiles,
  DEFAULT_BODY_FONT,
  DEFAULT_HEADLINE_FONT,
} from "@/lib/comms/canvas-fonts";
import {
  embedDocxBrandFonts,
  listEmbeddedOoxmlFonts,
  obfuscateOoxmlFont,
} from "@/lib/export/ooxml-font-embed";
import { renderDocxFromPreset, renderPptx } from "@/lib/export/office-export";

describe("ooxml-font-embed", () => {
  it("collectOfficeEmbedTtfFiles dedupes headline and body weights", () => {
    const files = collectOfficeEmbedTtfFiles("montserrat", "sourceSans");
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.relativePath.endsWith(".ttf"))).toBe(true);
    expect(files.some((f) => f.family === "Montserrat")).toBe(true);
    expect(files.some((f) => f.family === "Source Sans 3")).toBe(true);
  });

  it("collectOfficeEmbedTtfFiles returns empty for system faces", () => {
    expect(
      collectOfficeEmbedTtfFiles("systemSans", "systemSerif"),
    ).toEqual([]);
  });

  it("obfuscateOoxmlFont XORs first 32 bytes", () => {
    const raw = new Uint8Array([1, 2, 3, 4, 5]);
    const out = obfuscateOoxmlFont(raw, "{00000000-0000-0000-0000-000000000001}");
    expect(out[0]).not.toBe(raw[0]);
  });

  it(
    "embedDocxBrandFonts adds obfuscated fonts and NOTICE to DOCX",
    async () => {
      const base = await renderDocxFromPreset({
        presetId: "simple-letter",
        palette: {
          primary: "#9E1B32",
          secondary: "#5C0A1A",
          accent: "#C45C26",
        },
        localLabel: "Local 110",
        fields: {
          date: "July 15",
          memberName: "Alex",
          body: "Hello",
          stewardName: "Jordan",
          contactName: "LEC",
        },
        headlineFontId: DEFAULT_HEADLINE_FONT,
        bodyFontId: DEFAULT_BODY_FONT,
      });
      const embedded = await listEmbeddedOoxmlFonts(base);
      expect(embedded.length).toBeGreaterThan(0);
      expect(embedded.some((p) => p.endsWith(".odttf"))).toBe(true);

      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(await base.arrayBuffer());
      expect(zip.file("word/fonts/NOTICE.txt")).toBeTruthy();
      const fontTable = await zip.file("word/fontTable.xml")?.async("string");
      expect(fontTable).toContain("Montserrat");
      expect(fontTable).toContain("Source Sans 3");
    },
    30_000,
  );

  it(
    "embedPptxBrandFonts adds font parts to PPTX",
    async () => {
      const base = await renderPptx({
        presetId: "simple-letter",
        title: "Letter",
        localLabel: "Local 110",
        palette: {
          primary: "#003366",
          secondary: "#001a33",
          accent: "#c45c26",
        },
        fields: {
          body: "Test",
          contactName: "LEC",
        },
        headlineFontId: DEFAULT_HEADLINE_FONT,
        bodyFontId: DEFAULT_BODY_FONT,
      });
      const embedded = await listEmbeddedOoxmlFonts(base);
      expect(embedded.some((p) => p.endsWith(".fntdata"))).toBe(true);
    },
    30_000,
  );

  it("embedDocxBrandFonts is a no-op for system-only Brand Kit", async () => {
    const { Packer, Document, Paragraph, TextRun } = await import("docx");
    const raw = await Packer.toBlob(
      new Document({
        sections: [{ children: [new Paragraph({ children: [new TextRun("x")] })] }],
      }),
    );
    const out = await embedDocxBrandFonts(raw, "systemSans", "systemSerif");
    const embedded = await listEmbeddedOoxmlFonts(out);
    expect(embedded).toEqual([]);
  });
});
