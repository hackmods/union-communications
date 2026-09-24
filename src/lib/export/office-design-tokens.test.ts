import { describe, expect, it } from "vitest";
import {
  applyExcelDesignTokens,
  createOfficeDesignTokens,
} from "./office-design-tokens";

describe("office-design-tokens excel", () => {
  it("records contrasting ink on primary for brand orange", () => {
    const tokens = createOfficeDesignTokens({
      palette: {
        primary: "#C2410C",
        secondary: "#7C2D12",
        accent: "#EA580C",
      },
      headlineFont: "Oswald",
      bodyFont: "Lato",
    });
    expect(tokens.colors.inkOnPrimary).toBe("FFFFFF");
    expect(tokens.excel.titleHeight).toBeGreaterThanOrEqual(28);
  });

  it(
    "does not clobber cell font color when applying workbook chrome",
    async () => {
      const excelMod = await import("exceljs");
      const ExcelNS = (excelMod.default ?? excelMod) as typeof import("exceljs");
      const workbook = new ExcelNS.Workbook();
      const ws = workbook.addWorksheet("Sheet");
      ws.getCell("A1").value = "Title";
      ws.getCell("A1").font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
        name: "Oswald",
      };
      ws.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC2410C" },
      };

      applyExcelDesignTokens(
        workbook,
        createOfficeDesignTokens({
          palette: {
            primary: "#C2410C",
            secondary: "#7C2D12",
            accent: "#EA580C",
          },
          headlineFont: "Oswald",
          bodyFont: "Lato",
        }),
      );

      expect(ws.getCell("A1").font?.color).toEqual({ argb: "FFFFFFFF" });
      expect(ws.getCell("A1").font?.name).toBe("Oswald");
      expect(ws.getRow(1).height).toBeGreaterThanOrEqual(28);
    },
    20_000,
  );
});
