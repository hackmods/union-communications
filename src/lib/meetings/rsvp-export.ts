import type { RsvpResponse, UnionMeeting } from "@/types/meetings";

function esc(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

/** CSV export of RSVP responses for Hub officers. */
export function buildRsvpResponsesCsv(opts: {
  meeting: UnionMeeting;
  responses: RsvpResponse[];
}): string {
  const header = [
    "display_name",
    "attending",
    "join_mode",
    "guests_on_site",
    "role_or_office",
    "email",
    "phone",
    "dietary_note",
    "accessibility_note",
    "source",
    "created_at",
  ].join(",");

  const lines = [header];
  for (const row of opts.responses) {
    lines.push(
      [
        esc(row.displayName),
        esc(row.attending),
        esc(row.joinMode ?? ""),
        String(row.guestsOnSite ?? ""),
        esc(row.roleOrOffice ?? ""),
        esc(row.email ?? ""),
        esc(row.phone ?? ""),
        esc(row.dietaryNote ?? ""),
        esc(row.accessibilityNote ?? ""),
        esc(row.source),
        esc(row.createdAt),
      ].join(","),
    );
  }
  return lines.join("\n");
}
