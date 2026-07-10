import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE_MB } from "@/lib/constants/brand";

export type ValidationResult =
  | { valid: true; file: File }
  | { valid: false; error: string };

export function validateImageFile(file: File): ValidationResult {
  const isSvg =
    file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  const isAllowedType =
    isSvg ||
    ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    );

  if (!isAllowedType) {
    return {
      valid: false,
      error: "Invalid file type. Use JPEG, PNG, WebP, or SVG.",
    };
  }

  const maxBytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_UPLOAD_SIZE_MB}MB.`,
    };
  }

  return { valid: true, file };
}
