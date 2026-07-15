import type { OfficePresetId } from "@/lib/constants/office-templates";
import type { XlsxFillFn } from "@/lib/export/office-export";

/**
 * Per-preset Excel fill — maps form tags into the colored baseline sheet.
 */
export function fillForPreset(
  presetId: OfficePresetId,
  data: Record<string, string>,
): XlsxFillFn {
  return (workbook) => {
    const sheet =
      workbook.getWorksheet("Details") ?? workbook.worksheets[0] ?? null;
    if (!sheet) return;

    sheet.getCell("B1").value = data.localNumber ?? "";
    sheet.getCell("B2").value = data.title ?? "";
    sheet.getCell("B3").value = data.date ?? "";
    sheet.getCell("B4").value = data.time ?? "";
    sheet.getCell("B5").value = data.location ?? "";
    sheet.getCell("B6").value = data.memberName ?? "";
    sheet.getCell("B7").value = data.stewardName ?? data.contactName ?? "";
    sheet.getCell("B8").value = data.body ?? "";
    sheet.getCell("B9").value = data.cta ?? data.headline ?? "";

    // formal-grievance roster-style extras
    if (presetId === "formal-grievance") {
      sheet.getCell("A11").value = "Member";
      sheet.getCell("B11").value = "Role";
      sheet.getCell("C11").value = "Notes";
      sheet.getCell("A12").value = data.memberName ?? "";
      sheet.getCell("B12").value = "Grievor";
      sheet.getCell("C12").value = data.title ?? "";
      sheet.getCell("A13").value = data.stewardName ?? "";
      sheet.getCell("B13").value = "Steward";
      sheet.getCell("C13").value = data.contactName ?? "";
    }
  };
}
