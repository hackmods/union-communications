import { describe, expect, it, vi } from "vitest";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";
import {
  EDUCATION_FOOTER,
  STEWARD_WORKSPACE_FOOTER,
  certificateBrandLogoPlacement,
  certificatePlatformMarkPlacement,
  guidePdfMarkPlacementPt,
  writeBrandedChecklistPdf,
} from "./text-pdf-layout";

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async () => undefined),
}));

import { saveBlob } from "@/lib/export/save-blob";

describe("guidePdfMarkPlacementPt", () => {
  it("returns null without logo bytes", () => {
    expect(guidePdfMarkPlacementPt(null)).toBeNull();
    expect(guidePdfMarkPlacementPt(undefined)).toBeNull();
    expect(
      guidePdfMarkPlacementPt({
        bytes: new Uint8Array(),
        widthPx: 100,
        heightPx: 40,
        src: "",
      }),
    ).toBeNull();
  });

  it("places a scaled mark in the letter header band", () => {
    const bytes = transparentPngBytes();
    const placement = guidePdfMarkPlacementPt({
      bytes,
      widthPx: 192,
      heightPx: 96,
      src: "data:image/png;base64,aaa",
    });
    expect(placement).not.toBeNull();
    expect(placement!.draw).toBe(true);
    expect(placement!.x).toBe(48);
    expect(placement!.y).toBe(36);
    expect(placement!.widthPt).toBeGreaterThan(0);
    expect(placement!.heightPt).toBeLessThanOrEqual(36 + 1e-9);
  });
});

describe("certificate dual-logo placement", () => {
  it("places platform mark top-left", () => {
    const bytes = transparentPngBytes();
    const placement = certificatePlatformMarkPlacement({
      bytes,
      widthPx: 192,
      heightPx: 96,
      src: "data:image/png;base64,aaa",
    });
    expect(placement).not.toBeNull();
    expect(placement!.x).toBe(0.55);
    expect(placement!.y).toBe(0.55);
    expect(placement!.heightIn).toBeLessThanOrEqual(0.42 + 1e-9);
  });

  it("moves Brand Kit logo top-right when platform mark is present", () => {
    const bytes = transparentPngBytes();
    const alone = certificateBrandLogoPlacement(
      {
        bytes,
        extension: "png",
        widthPx: 240,
        heightPx: 96,
        src: "data:image/png;base64,aaa",
      },
      { withPlatformMark: false },
    );
    const withPlatform = certificateBrandLogoPlacement(
      {
        bytes,
        extension: "png",
        widthPx: 240,
        heightPx: 96,
        src: "data:image/png;base64,aaa",
      },
      { withPlatformMark: true },
    );
    expect(alone!.x).toBe(0.65);
    expect(withPlatform!.x).toBeGreaterThan(5);
    expect(withPlatform!.x + withPlatform!.widthIn).toBeLessThanOrEqual(
      11 - 0.65 + 1e-9,
    );
  });
});

describe("education footers", () => {
  it("names UnionOps in EN and FR", () => {
    expect(EDUCATION_FOOTER.en).toMatch(/UnionOps/);
    expect(EDUCATION_FOOTER.fr).toMatch(/UnionOps/);
    expect(EDUCATION_FOOTER.en).toMatch(/not legal advice/i);
    expect(EDUCATION_FOOTER.fr).toMatch(/Pas un avis juridique/);
    expect(STEWARD_WORKSPACE_FOOTER.en).toMatch(/UnionOps/);
  });
});

describe("writeBrandedChecklistPdf", () => {
  it("emits a PDF blob with title, footer, and embedded mark image", async () => {
    const bytes = transparentPngBytes();
    const mark = {
      bytes,
      widthPx: 192,
      heightPx: 96,
      src: `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`,
    };

    await writeBrandedChecklistPdf({
      title: "FAR sheet — Facts / Argument / Resolution",
      subtitle: "Contract Enforcement · Local 243",
      sections: [{ heading: "Facts", lines: ["Who / when / where:"] }],
      filename: "unionops-far-sheet-test.pdf",
      footer: EDUCATION_FOOTER.en,
      platformMark: mark,
    });

    expect(saveBlob).toHaveBeenCalledOnce();
    const [blob, filename] = vi.mocked(saveBlob).mock.calls[0]!;
    expect(filename).toBe("unionops-far-sheet-test.pdf");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);

    const data = new Uint8Array(await blob.arrayBuffer());
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data }).promise;
    expect(doc.numPages).toBeGreaterThanOrEqual(1);
    const page = await doc.getPage(1);
    const text = await page.getTextContent();
    const joined = text.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    expect(joined).toMatch(/FAR sheet/i);
    expect(joined).toMatch(/UnionOps Officer Learning/i);

    const ops = await page.getOperatorList();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OPS = (pdfjs as any).OPS ?? {};
    const paintImage = ops.fnArray.some((fn: number) => {
      const name = Object.entries(OPS).find(([, v]) => v === fn)?.[0] ?? "";
      return /paintImage/i.test(name);
    });
    expect(paintImage).toBe(true);
  });
});

describe("writeBrandedNotesPdf", () => {
  it("emits a steward workspace PDF with platform footer and mark", async () => {
    const { writeBrandedNotesPdf } = await import("./text-pdf-layout");
    vi.mocked(saveBlob).mockClear();

    const bytes = transparentPngBytes();
    const mark = {
      bytes,
      widthPx: 192,
      heightPx: 96,
      src: `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`,
    };

    await writeBrandedNotesPdf({
      title: "Complaint vs grievance diagnostic",
      body: "## Notes\n\nMember story here.",
      filename: "complaint-vs-grievance.pdf",
      footer: STEWARD_WORKSPACE_FOOTER.en,
      platformMark: mark,
    });

    expect(saveBlob).toHaveBeenCalledOnce();
    const [blob] = vi.mocked(saveBlob).mock.calls[0]!;
    const data = new Uint8Array(await blob.arrayBuffer());
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const text = await page.getTextContent();
    const joined = text.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    expect(joined).toMatch(/Complaint vs grievance/i);
    expect(joined).toMatch(/UnionOps steward workspace/i);
  });
});
