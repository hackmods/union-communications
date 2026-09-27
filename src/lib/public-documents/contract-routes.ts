type ContractPublication = {
  unpublished?: true;
  payload?: {
    kind?: string;
    humanApproved?: boolean;
    effectiveAt?: string;
    content?: { en?: string; fr?: string };
  };
} | null;

/** A contract route opens only approved, effective, bilingual managed policy text. */
export function hasPublishedContractDocument(
  document: ContractPublication,
  now = new Date(),
): boolean {
  if (
    !document ||
    document.unpublished ||
    document.payload?.kind !== "policy" ||
    document.payload.humanApproved !== true ||
    !document.payload.content?.en?.trim() ||
    !document.payload.content?.fr?.trim() ||
    !document.payload.effectiveAt
  ) {
    return false;
  }
  const effectiveAt = Date.parse(document.payload.effectiveAt);
  return Number.isFinite(effectiveAt) && effectiveAt <= now.getTime();
}
