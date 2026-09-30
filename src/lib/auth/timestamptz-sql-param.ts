/**
 * ISO-8601 timestamptz binds for Drizzle `sql` templates.
 * Bare `Date` objects stringify as "Wed Sep 30 … GMT" which Postgres rejects.
 */

const ISO_TIMESTAMPTZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export function toTimestamptzSqlParam(value: Date | number | string): string {
  if (
    typeof value === "string" &&
    /GMT|^Wed |^Mon |^Tue |^Thu |^Fri |^Sat |^Sun /i.test(value)
  ) {
    throw new Error(
      "toTimestamptzSqlParam rejected Date#toString()-shaped input",
    );
  }
  const iso =
    typeof value === "number"
      ? new Date(value).toISOString()
      : value instanceof Date
        ? value.toISOString()
        : value.trim();
  if (!ISO_TIMESTAMPTZ.test(iso)) {
    throw new Error(
      `toTimestamptzSqlParam requires ISO-8601 UTC; got ${JSON.stringify(iso)}`,
    );
  }
  return iso;
}

export function isSafeTimestamptzSqlParam(value: unknown): boolean {
  return typeof value === "string" && ISO_TIMESTAMPTZ.test(value);
}
