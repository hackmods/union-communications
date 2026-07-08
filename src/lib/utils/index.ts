import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { resolveLocalNumber } from "./local";

export { resolveLocalNumber, DEFAULT_LOCAL_NUMBER } from "./local";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatFilename(
  prefix: string,
  localNumber: string,
  ext: string,
): string {
  const num = resolveLocalNumber(localNumber);
  return `${slugify(prefix)}-local-${num}.${ext}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function revokeObjectUrl(url: string | undefined) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
