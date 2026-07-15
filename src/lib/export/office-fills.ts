import type { OfficePresetId } from "@/lib/constants/office-templates";
import type { XlsxFillFn } from "@/lib/export/office-export";

/**
 * Per-preset Excel fill — maps form tags into Steps / RSVP baseline sheets.
 */
export function fillForPreset(
  presetId: OfficePresetId,
  data: Record<string, string>,
): XlsxFillFn {
  return (workbook) => {
    if (presetId === "formal-grievance") {
      const sheet =
        workbook.getWorksheet("Steps") ?? workbook.worksheets[0] ?? null;
      if (!sheet) return;
      sheet.getCell("B1").value = data.localNumber ?? "";
      sheet.getCell("B2").value = data.title ?? "";
      sheet.getCell("B3").value = data.memberName ?? "";
      sheet.getCell("A6").value = data.date ?? "";
      sheet.getCell("B6").value = "1";
      sheet.getCell("C6").value = data.body ?? "";
      sheet.getCell("D6").value = data.stewardName ?? "";
      sheet.getCell("E6").value = "Open";
      sheet.getCell("A7").value = "";
      sheet.getCell("B7").value = "2";
      sheet.getCell("C7").value = data.contactName
        ? `Follow up: ${data.contactName}`
        : "";
      sheet.getCell("D7").value = data.contactName ?? "";
      sheet.getCell("E7").value = "Planned";
      return;
    }

    if (presetId === "quick-event") {
      const sheet =
        workbook.getWorksheet("RSVP") ?? workbook.worksheets[0] ?? null;
      if (!sheet) return;
      sheet.getCell("B1").value = data.title ?? "";
      sheet.getCell("B2").value = data.localNumber ?? "";
      sheet.getCell("B3").value = [data.date, data.time].filter(Boolean).join(" · ");
      sheet.getCell("B4").value = data.location ?? "";
      return;
    }

    // Fallback for any legacy Details sheet
    const sheet =
      workbook.getWorksheet("Details") ?? workbook.worksheets[0] ?? null;
    if (!sheet) return;
    sheet.getCell("B1").value = data.localNumber ?? "";
    sheet.getCell("B2").value = data.title ?? "";
  };
}
