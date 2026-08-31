import {
  PRINT_PAGE_PX_PER_INCH,
  printPageExportPixelRatio,
  printPagePreviewHeightPx,
  printPagePreviewWidthPx,
  type PrintPagePreviewSpec,
} from "@/lib/comms/print-page-formats";

export type BoardNoticeFormatId = "letter" | "tabloid";

export interface BoardNoticeFormatSpec extends PrintPagePreviewSpec {
  id: BoardNoticeFormatId;
  aspect: string;
}

/** @deprecated Prefer PRINT_PAGE_PX_PER_INCH */
export const BOARD_NOTICE_PX_PER_INCH = PRINT_PAGE_PX_PER_INCH;

export const BOARD_NOTICE_FORMATS: Record<
  BoardNoticeFormatId,
  BoardNoticeFormatSpec
> = {
  letter: {
    id: "letter",
    aspect: "aspect-[8.5/11]",
    widthInches: 8.5,
    heightInches: 11,
    previewWidthPx: printPagePreviewWidthPx(8.5),
  },
  tabloid: {
    id: "tabloid",
    aspect: "aspect-[11/17]",
    widthInches: 11,
    heightInches: 17,
    previewWidthPx: printPagePreviewWidthPx(11),
  },
};

export const boardNoticePreviewHeightPx = printPagePreviewHeightPx;

export const boardNoticeExportPixelRatio = printPageExportPixelRatio;
