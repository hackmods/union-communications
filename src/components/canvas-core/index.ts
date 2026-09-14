export type {
  AssetBounds,
  CanvasAspectId,
  CanvasConfig,
  CanvasExportFormat,
  CanvasExportOptions,
  CanvasMode,
  SafeZoneProfile,
} from "./types";
export {
  DEFAULT_LOGO_BOUNDS,
  MARK_BOUNDS,
  WIDE_LOCKUP_BOUNDS,
} from "./types";

export {
  CanvasWrapper,
  FitWidthFrame,
  CANVAS_CONTAINER_NAME,
} from "./CanvasWrapper";
export type { CanvasWrapperProps } from "./CanvasWrapper";

export { LogoContainer } from "./LogoContainer";
export type { LogoContainerProps } from "./LogoContainer";

export {
  safeZoneInsets,
  contentPadCqw,
  CONTENT_PAD_CQW,
  CONTENT_GAP_CQW,
  PRINT_BLEED_CQW,
} from "./safe-zone";

export {
  useCanvasExport,
  resolveExportPixelRatio,
} from "./use-canvas-export";

/** Re-export existing canvas chrome primitives under the new namespace. */
export {
  CanvasGrainOverlay,
  CanvasSafeZoneOverlay,
  CanvasEdgeClearanceFrame,
  CanvasBrandHeader,
  CanvasStackSlot,
  CanvasTypeBlock,
  CanvasFitStackedHeadline,
  CanvasQrPlate,
  CanvasUrlCaption,
  CanvasDuotonePhoto,
} from "@/components/tools/canvas";
