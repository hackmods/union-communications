import {
  PRINT_PAGE_PX_PER_INCH,
  printPageExportPixelRatio,
  printPagePreviewHeightPx,
  printPagePreviewWidthPx,
  type PrintPagePreviewSpec,
} from "@/lib/comms/print-page-formats";
import { CANVAS_ASPECTS } from "@/lib/comms/canvas-aspects";

export type BoardNoticeFormatId = "letter" | "tabloid" | "a4";

export const BOARD_NOTICE_FORMAT_ORDER: readonly BoardNoticeFormatId[] = [
  "letter",
  "tabloid",
  "a4",
] as const;

export interface BoardNoticeFormatSpec extends PrintPagePreviewSpec {
  id: BoardNoticeFormatId;
  aspect: string;
}

/** @deprecated Prefer PRINT_PAGE_PX_PER_INCH */
export const BOARD_NOTICE_PX_PER_INCH = PRINT_PAGE_PX_PER_INCH;

const a4 = CANVAS_ASPECTS.a4;

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
  a4: {
    id: "a4",
    aspect: a4.aspectClass ?? "aspect-[210/297]",
    widthInches: a4.widthInches!,
    heightInches: a4.heightInches!,
    previewWidthPx: a4.designWidthPx,
  },
};

export const boardNoticePreviewHeightPx = printPagePreviewHeightPx;

export const boardNoticeExportPixelRatio = printPageExportPixelRatio;
