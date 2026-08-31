export type BoardNoticeFormatId = "letter" | "tabloid";

export interface BoardNoticeFormatSpec {
  id: BoardNoticeFormatId;
  aspect: string;
  widthInches: number;
  heightInches: number;
  /** Fixed CSS design width — preview scales down via MobilePreviewStage. */
  previewWidthPx: number;
}

/** ~36 px/in keeps letter previews readable in the form column without overflow. */
export const BOARD_NOTICE_PX_PER_INCH = 36;

export const BOARD_NOTICE_FORMATS: Record<
  BoardNoticeFormatId,
  BoardNoticeFormatSpec
> = {
  letter: {
    id: "letter",
    aspect: "aspect-[8.5/11]",
    widthInches: 8.5,
    heightInches: 11,
    previewWidthPx: Math.round(8.5 * BOARD_NOTICE_PX_PER_INCH),
  },
  tabloid: {
    id: "tabloid",
    aspect: "aspect-[11/17]",
    widthInches: 11,
    heightInches: 17,
    previewWidthPx: Math.round(11 * BOARD_NOTICE_PX_PER_INCH),
  },
};

export function boardNoticePreviewHeightPx(
  format: Pick<BoardNoticeFormatSpec, "previewWidthPx" | "widthInches" | "heightInches">,
): number {
  return Math.round(
    format.previewWidthPx * (format.heightInches / format.widthInches),
  );
}

/** Target ~300dpi letter width for PNG/PDF export from the fixed design canvas. */
export function boardNoticeExportPixelRatio(
  format: Pick<BoardNoticeFormatSpec, "previewWidthPx" | "widthInches">,
  targetWidthPx = 2550,
): number {
  return Math.max(2, Math.min(4, targetWidthPx / format.previewWidthPx));
}
