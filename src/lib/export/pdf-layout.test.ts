import { describe, expect, it, vi } from "vitest";
import { COMMS_GUIDE_FOOTER, EDUCATION_FOOTER, writeBrandedWorksheetPdf } from "@/lib/export/text-pdf-layout";
import {
  buildWorksheet,
  layoutWorksheet,
  resolveWorksheetLayoutMode,
  validateWorksheetLayout,
  wsLine,
  PDF_ENGINE_STRAGGLERS,
} from "@/lib/export/pdf-layout";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";
import {
  expectBlockOrder,
  expectFooterBandOrder,
  findTextY,
  parseWorksheetPdfBlob,
} from "@/lib/export/worksheet-pdf-test-helpers";
import { downloadLandAcknowledgementWorksheetPdf } from "@/lib/comms/land-acknowledgement-worksheet-pdf";
import { downloadFarSheetPdf } from "@/lib/officer-learning/reference-pdf";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { guidePdfBrandFromKit } from "@/lib/export/text-pdf-layout";

vi.mock("@/lib/export/save-blob", () => ({
  saveBlob: vi.fn(async () => undefined),
}));

import { saveBlob } from "@/lib/export/save-blob";

const mark = {
  bytes: transparentPngBytes(),
  widthPx: 192,
  heightPx: 96,
  src: `data:image/png;base64,${Buffer.from(transparentPngBytes()).toString("base64")}`,
};

describe("pdf-layout engine", () => {
  it("lists jsPDF stragglers for audit inventory", () => {
    expect(PDF_ENGINE_STRAGGLERS.length).toBeGreaterThanOrEqual(4);
    expect(PDF_ENGINE_STRAGGLERS.some((s) => s.path.includes("travel/export"))).toBe(true);
  });

  it("resolves layout modes from structure", () => {
    expect(
      resolveWorksheetLayoutMode({
        sections: [{ heading: "A", lines: [{ kind: "text", text: "x" }] }],
      }),
    ).toBe("flow");
    expect(
      resolveWorksheetLayoutMode({
        sections: [{ heading: "A", lines: [{ kind: "ruled", fill: true }] }],
      }),
    ).toBe("pinnedFooter");
    expect(
      resolveWorksheetLayoutMode({
        sections: [],
        closingSections: [{ heading: "Close", lines: [] }],
      }),
    ).toBe("pinnedClosing");
  });

  it("rejects invalid worksheet combinations", () => {
    const result = validateWorksheetLayout({
      title: "Bad",
      layoutMode: "flow",
      sections: [],
      closingSections: [{ heading: "Step 4", lines: [] }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/pinnedClosing/);
  });

  it("warns when fill has no maxRows", () => {
    const result = validateWorksheetLayout({
      title: "Fill",
      sections: [
        {
          heading: "Draft",
          lines: [{ kind: "ruled", fill: true, minRows: 6 }],
        },
      ],
    });
    expect(result.warnings.join(" ")).toMatch(/maxRows/);
  });

  it("layoutWorksheet reports fit for land ack template shape", () => {
    const budget = layoutWorksheet({
      title: "Land acknowledgement — floor handout",
      subtitle: "Local 243",
      layoutMode: "flow",
      sections: [
        { heading: "Step 3", lines: [wsLine.ruled(8, 16)] },
        { heading: "Step 4", lines: [wsLine.checkPair("a", "b")] },
      ],
      tips: { heading: "Floor tips", lines: ["Territory first."] },
      reminder: "Education only.",
      footer: COMMS_GUIDE_FOOTER.en,
    });
    expect(budget.layoutMode).toBe("flow");
    expect(budget.errors).toHaveLength(0);
  });

  it("builder produces equivalent structure", () => {
    const built = buildWorksheet("Test sheet")
      .subtitle("Local 243")
      .layoutMode("flow")
      .section("Notes", [wsLine.ruled(3, 18)])
      .tips("Tips", ["Keep it short."])
      .build();
    expect(built.title).toBe("Test sheet");
    expect(built.sections[0]?.lines[0]?.kind).toBe("ruled");
  });
});

describe("guide PDF golden layout contracts", () => {
  const brand = guidePdfBrandFromKit(DEFAULT_BRAND_KIT);

  it("land ack: title above footer band order and step flow", async () => {
    vi.mocked(saveBlob).mockClear();
    await downloadLandAcknowledgementWorksheetPdf({
      localLabel: "Local 243",
      locale: "en",
      brand,
    });
    const parsed = await parseWorksheetPdfBlob(vi.mocked(saveBlob).mock.calls.at(-1)![0]);

    expect(parsed.numPages).toBe(1);
    expectBlockOrder(parsed, [
      "Land acknowledgement",
      "Before you start",
      "Step 1",
      "Step 2",
      "Step 3",
      "Step 4",
      "Floor tips",
    ]);
    expectFooterBandOrder(parsed, {
      tipsHeading: "Floor tips",
      firstBullet: "Territory first",
      reminder: "Education only",
      disclaimer: "UnionOps Comms",
    });

    const titleY = findTextY(parsed, "Land acknowledgement");
    const step4Y = findTextY(parsed, "Step 4");
    expect(titleY).toBeDefined();
    expect(step4Y).toBeDefined();
    expect(titleY!).toBeGreaterThan(step4Y!);
  });

  it("FAR checklist: title precedes section headings", async () => {
    vi.mocked(saveBlob).mockClear();
    await downloadFarSheetPdf({
      moduleTitle: "Contract Enforcement",
      localLabel: "Local 243",
      locale: "en",
      brand,
    });
    const parsed = await parseWorksheetPdfBlob(vi.mocked(saveBlob).mock.calls.at(-1)![0]);
    expect(parsed.joined).toMatch(/FAR sheet/i);
    const titleY = findTextY(parsed, "FAR sheet");
    const factsY = findTextY(parsed, "Facts (what happened");
    expect(titleY).toBeDefined();
    expect(factsY).toBeDefined();
    expect(titleY!).toBeGreaterThan(factsY!);
  });

  it("renders table and columnLayout primitives", async () => {
    vi.mocked(saveBlob).mockClear();
    await writeBrandedWorksheetPdf({
      platformMark: mark,
      title: "Advanced primitives",
      subtitle: "Local 243",
      layoutMode: "flow",
      sections: [
        {
          heading: "Grid",
          lines: [
            wsLine.columns([wsLine.field("Left")], [wsLine.field("Right")]),
            wsLine.table(["Name", "Role"], 2, 14),
          ],
        },
      ],
      filename: "unionops-advanced-primitives-test.pdf",
      footer: EDUCATION_FOOTER.en,
    });
    const parsed = await parseWorksheetPdfBlob(vi.mocked(saveBlob).mock.calls.at(-1)![0]);
    expect(parsed.joined).toMatch(/Advanced primitives/);
    expect(parsed.joined).toMatch(/Name/);
    expect(parsed.joined).toMatch(/Role/);
  });
});
