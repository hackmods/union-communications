export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

/** Convert `#RRGGBB` to `rgba(r,g,b,a)` for dynamic gradients. */
export function hexToRgba(hex: string, alpha: number): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return null;

  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWcagAA(
  foreground: string,
  background: string,
  largeText = false,
): boolean {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) return false;
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

export type ContrastResult = {
  ratio: number | null;
  passesAA: boolean;
  passesAALarge: boolean;
};

export function checkContrast(
  foreground: string,
  background: string,
): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  return {
    ratio,
    passesAA: ratio !== null && ratio >= 4.5,
    passesAALarge: ratio !== null && ratio >= 3,
  };
}
