import { describe, expect, it, vi } from "vitest";
import {
  COMMS_GUIDE_FOOTER,
  EDUCATION_FOOTER,
  HUB_INTERNAL_REPORT_FOOTER,
  writeBrandedWorksheetPdf,
  createHubInternalReportPdfBlob,
} from "@/lib/export/text-pdf-layout";
import {
  buildWorksheet,
  layoutWorksheet,
  resolveWorksheetLayoutMode,
  validateWorksheetLayout,
  wsLine,
  PDF_ENGINE_STRAGGLERS,
  resolveHeaderStartYAfterMark,
  WORKSHEET_MARK_TITLE_GAP,
  CHECKLIST_MARK_TITLE_GAP,
} from "@/lib/export/pdf-layout";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";
import {
  expectBlockOrder,
  expectFooterBandOrder,
  expectMinFieldBlockGap,
  expectMinVerticalGap,
  expectPairUsesRowColumns,
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
  it("lists remaining jsPDF exceptions (canvas + certificate)", () => {
    expect(PDF_ENGINE_STRAGGLERS.length).toBe(2);
    expect(PDF_ENGINE_STRAGGLERS.some((s) => s.path.includes("pdf-export"))).toBe(true);
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

  it("warns when stack layout is unnecessary for short pair labels", () => {
    const result = validateWorksheetLayout({
      title: "Stacked pairs",
      sections: [
        {
          heading: "Step 4",
          lines: [
            {
              kind: "checkPair",
              left: "Accurate",
              right: "Explainable",
              layout: "stack",
            },
            {
              kind: "fieldPair",
              left: { label: "Local" },
              right: { label: "Date" },
              layout: "stack",
            },
          ],
        },
      ],
    });
    expect(result.warnings.join(" ")).toMatch(/side-by-side/);
  });

  it("does not warn on stack when labels wrap in row columns", () => {
    const longLeft = "Who reads it at the next meeting and records the outcome?";
    const longRight =
      "Federation guide (OFL / national / CUPE / other) with extra context";
    const result = validateWorksheetLayout({
      title: "Wrapped stack",
      sections: [
        {
          heading: "Review",
          lines: [
            {
              kind: "fieldPair",
              left: { label: longLeft },
              right: { label: longRight },
              layout: "stack",
            },
          ],
        },
      ],
    });
    expect(result.warnings.join(" ")).not.toMatch(/side-by-side/);
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

  it("uses canonical mark-to-title gaps per profile", () => {
    const placement = { y: 24, heightPt: 26, draw: true, x: 18, widthPt: 52 };
    expect(resolveHeaderStartYAfterMark(placement, "worksheet", 18)).toBe(
      24 + 26 + WORKSHEET_MARK_TITLE_GAP,
    );
    expect(resolveHeaderStartYAfterMark(placement, "checklist", 48)).toBe(
      24 + 26 + CHECKLIST_MARK_TITLE_GAP,
    );
  });

  it("wraps long fieldPair and checkPair labels on any worksheet template", async () => {
    vi.mocked(saveBlob).mockClear();
    await writeBrandedWorksheetPdf({
      platformMark: mark,
      title: "Engine field wrap contract",
      subtitle: "Local 243",
      layoutMode: "flow",
      sections: [
        {
          heading: "Review and commit",
          lines: [
            wsLine.fieldPair(
              "Who reads it at the next meeting?",
              "Federation guide (OFL / national / CUPE / other)",
            ),
            wsLine.checkPair(
              "Accurate for this territory (not another city)",
              "Speaker can explain every phrase without notes",
            ),
            wsLine.checkPair(
              "Pairs words with one concrete local action",
              "Indigenous Circle / equity contact consulted if unsure",
            ),
          ],
        },
      ],
      tips: { heading: "Floor tips", lines: ["Territory first."] },
      reminder: "Education only.",
      filename: "unionops-field-wrap-contract.pdf",
      footer: COMMS_GUIDE_FOOTER.en,
    });

    const parsed = await parseWorksheetPdfBlob(vi.mocked(saveBlob).mock.calls.at(-1)![0]);
    expect(parsed.joined).toMatch(/CUPE \/ other/i);
    expect(parsed.joined).toMatch(/without notes/i);
    expect(parsed.joined).toMatch(/consulted if unsure/i);
    expectMinVerticalGap(parsed, "Engine field wrap", "Local 243", 10);
    expectMinVerticalGap(parsed, "Review and commit", "Floor tips", 24);
    expectPairUsesRowColumns(
      parsed,
      "Who reads it at the next meeting",
      "Federation guide (OFL",
    );
    expectPairUsesRowColumns(
      parsed,
      "Accurate for this territory",
      "Speaker can explain",
    );
    expectMinFieldBlockGap(parsed, "Who reads it at the next meeting", "Accurate for this territory");
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

  it("hub internal reports use shared chrome and internal footer", async () => {
    const blob = await createHubInternalReportPdfBlob({
      title: "Travel authorization — expense package",
      body: "Event: Steward conference\n\n# Line items\n2026-01-01 | travel | Train | 120.00",
    });
    const parsed = await parseWorksheetPdfBlob(blob);
    expect(parsed.joined).toMatch(/Travel authorization/);
    expect(parsed.joined).toMatch(/UnionOps Officer Hub/);
    expect(parsed.joined).toMatch(/SAP\/ERP/);
    expect(parsed.joined).not.toContain(HUB_INTERNAL_REPORT_FOOTER.fr);
  });
});
