/** Old managed records predate visibility and remain public by default. */
export function isPublicDocumentPayload(
  payload: { visibility?: unknown } | null | undefined,
): boolean {
  return payload?.visibility === undefined || payload.visibility === "public";
}

export function isInternalDocumentPayload(
  payload: { visibility?: unknown } | null | undefined,
): boolean {
  return payload?.visibility === "internal";
}

export function validateDocumentVisibility(input: {
  visibility?: unknown;
  kind: unknown;
  status: unknown;
  requiresAcceptance?: unknown;
  required?: unknown;
}): string | null {
  const visibility = input.visibility === undefined ? "public" : input.visibility;
  if (visibility !== "public" && visibility !== "internal") {
    return "visibility must be public or internal";
  }
  if (
    visibility === "internal" &&
    (input.status !== "draft" ||
      input.kind !== "policy" ||
      input.requiresAcceptance === true ||
      input.required === true)
  ) {
    return "Internal operating documents must remain policy drafts without public acceptance or launch-readiness requirements";
  }
  return null;
}
