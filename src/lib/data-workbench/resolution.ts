export type CandidateIdentifier = { id: string; namespace: string; value: string };

/** A stable, namespaced identifier is the only automatic person match. */
export function resolveByIdentifier(input: {
  namespace: string;
  value: string;
  candidates: CandidateIdentifier[];
}): { personId: string | null; reason: string | null; conflict: boolean } {
  const value = input.value.trim();
  if (!value) return { personId: null, reason: null, conflict: false };
  const matches = input.candidates.filter(
    (candidate) => candidate.namespace === input.namespace && candidate.value === value,
  );
  const uniquePeople = [...new Set(matches.map((match) => match.id))];
  if (uniquePeople.length > 1) return { personId: null, reason: "Identifier conflict requires review.", conflict: true };
  if (uniquePeople.length === 1) return { personId: uniquePeople[0], reason: `Matched by ${input.namespace}.`, conflict: false };
  return { personId: null, reason: null, conflict: false };
}

export function normalizePersonName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
