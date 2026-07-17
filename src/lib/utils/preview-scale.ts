/**
 * Scale factor so content fits inside a container without upsizing.
 * Used by mobile mini / full preview stages.
 */
export function computePreviewScale(
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  maxHeight: number,
): number {
  if (
    contentWidth <= 0 ||
    contentHeight <= 0 ||
    containerWidth <= 0 ||
    maxHeight <= 0
  ) {
    return 1;
  }
  return Math.min(1, containerWidth / contentWidth, maxHeight / contentHeight);
}
