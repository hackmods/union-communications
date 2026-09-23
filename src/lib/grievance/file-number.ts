const FILE_NUMBER_PAD = 4;
const FILE_NUMBER_PREFIX = "GRV";

/**
 * Format a grievance file number: `GRV-{year}-{padded seq}`.
 * Sequence is unique per unionId+localId (callers scope the existing set).
 */
export function formatGrievanceFileNumber(
  year: number,
  sequence: number,
): string {
  const seq = Math.max(1, Math.floor(sequence));
  return `${FILE_NUMBER_PREFIX}-${year}-${String(seq).padStart(FILE_NUMBER_PAD, "0")}`;
}

/**
 * Parse `GRV-2026-0007` → `{ year: 2026, sequence: 7 }`, or null if malformed.
 */
export function parseGrievanceFileNumber(
  fileNumber: string,
): { year: number; sequence: number } | null {
  const match = /^GRV-(\d{4})-(\d+)$/.exec(fileNumber.trim());
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const sequence = Number.parseInt(match[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(sequence) || sequence < 1) {
    return null;
  }
  return { year, sequence };
}

/**
 * Next `GRV-{year}-{seq}` for the given local scope.
 * Considers only file numbers matching the target year; sequence starts at 1.
 */
export function nextGrievanceFileNumber(
  existingFileNumbers: Iterable<string | undefined | null>,
  year: number = new Date().getFullYear(),
): string {
  let maxSeq = 0;
  for (const raw of existingFileNumbers) {
    if (!raw) continue;
    const parsed = parseGrievanceFileNumber(raw);
    if (!parsed || parsed.year !== year) continue;
    if (parsed.sequence > maxSeq) maxSeq = parsed.sequence;
  }
  return formatGrievanceFileNumber(year, maxSeq + 1);
}
