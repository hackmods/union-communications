import { describe, expect, it } from "vitest";
import { buildExpenseExportPdf } from "@/lib/expenses/export";
import { buildTimeExportPdf } from "@/lib/time/export-rollup";
import { buildTravelExportPdf } from "@/lib/travel/export";
import { HUB_INTERNAL_REPORT_FOOTER } from "@/lib/export/text-pdf-layout";
import { parseWorksheetPdfBlob } from "@/lib/export/worksheet-pdf-test-helpers";

describe("hub internal report PDFs", () => {
  it("travel export embeds mark and Hub internal footer", async () => {
    const blob = await buildTravelExportPdf({
      auth: {
        id: "auth-1",
        unionId: "union-1",
        localId: "local-1",
        eventName: "Steward conference",
        purpose: "Parent union assembly",
        eventStartDate: "2026-01-01",
        eventEndDate: "2026-01-03",
        requestedByName: "Alex Steward",
        status: "approved",
        estimatedCosts: { travel: 100, lodging: 200 },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      advance: { id: "a1", authorizationId: "auth-1", amount: 150, unionId: "union-1", localId: "local-1", createdAt: "", updatedAt: "" },
      claim: null,
    });
    const parsed = await parseWorksheetPdfBlob(blob);
    expect(parsed.joined).toMatch(/Travel authorization/);
    expect(parsed.joined).toMatch(/Steward conference/);
    expect(parsed.joined).toContain(HUB_INTERNAL_REPORT_FOOTER.en);
    expect((await blob.arrayBuffer()).byteLength).toBeGreaterThan(800);
  });

  it("expense export embeds mark and line items", async () => {
    const blob = await buildExpenseExportPdf({
      id: "exp-1",
      unionId: "union-1",
      localId: "local-1",
      title: "Mileage reimbursement",
      purpose: "Shop-floor visit",
      submittedByName: "Sam",
      status: "submitted",
      totalAmount: 45.5,
      lineItems: [
        { id: "li-1", date: "2026-01-01", category: "mileage", description: "Km", amount: 45.5 },
      ],
      createdAt: "",
      updatedAt: "",
    });
    const parsed = await parseWorksheetPdfBlob(blob);
    expect(parsed.joined).toMatch(/Union business expense submission/);
    expect(parsed.joined).toMatch(/Mileage reimbursement/);
    expect(parsed.joined).toContain(HUB_INTERNAL_REPORT_FOOTER.en);
  });

  it("time rollup export lists workers and categories", async () => {
    const blob = await buildTimeExportPdf([
      {
        id: "t1",
        unionId: "union-1",
        localId: "local-1",
        workerId: "w1",
        workerName: "Jordan",
        category: "staff",
        source: "clock",
        clockInAt: "2026-01-01T09:00:00.000Z",
        clockOutAt: "2026-01-01T17:00:00.000Z",
        createdAt: "",
        updatedAt: "",
      },
    ]);
    const parsed = await parseWorksheetPdfBlob(blob);
    expect(parsed.joined).toMatch(/Time rollup report/);
    expect(parsed.joined).toMatch(/Jordan/);
    expect(parsed.joined).toMatch(/staff/);
    expect(parsed.joined).toContain(HUB_INTERNAL_REPORT_FOOTER.en);
  });
});
