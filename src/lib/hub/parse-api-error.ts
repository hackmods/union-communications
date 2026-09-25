/** Read a steward-facing error string from a failed Hub API response. */
export async function readApiErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
  } catch {
    /* non-JSON body */
  }
  return fallback;
}

/** Map common API scope failures to i18n messages when present. */
export function mapScopeApiError(
  message: string,
  t: (key: "writeNoUnion" | "writeNoLocal") => string,
): string {
  const lower = message.toLowerCase();
  if (lower.includes("union") && (lower.includes("required") || lower.includes("missing"))) {
    return t("writeNoUnion");
  }
  if (lower.includes("local") && (lower.includes("required") || lower.includes("missing") || lower.includes("membership"))) {
    return t("writeNoLocal");
  }
  return message;
}
