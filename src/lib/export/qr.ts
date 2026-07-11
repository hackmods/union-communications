import QRCode from "qrcode";

/** Client-side QR as a PNG data URL. Returns null for empty/invalid input. */
export async function qrDataUrl(
  text: string,
  options?: { width?: number; margin?: number },
): Promise<string | null> {
  const value = text.trim();
  if (!value) return null;
  try {
    return await QRCode.toDataURL(value, {
      width: options?.width ?? 160,
      margin: options?.margin ?? 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#FFFFFF" },
    });
  } catch {
    return null;
  }
}
