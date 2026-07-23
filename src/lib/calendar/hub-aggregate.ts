/**
 * Authenticated Hub calendar aggregation — grievance meetings + bumping sessions.
 * Read-only; scopes via existing store list filters (union/local/steward).
 * Server-only (imports grievance/bumping stores).
 */

import type { BumpingListFilters } from "@/types/bumping";
import type { GrievanceListFilters } from "@/types/grievance";
import { bumpingStore } from "@/lib/bumping/store";
import { grievanceStore } from "@/lib/grievance/store";
import {
  sessionDateToWindow,
  type HubCalendarEvent,
} from "@/lib/calendar/hub-events";

export type {
  HubCalendarEvent,
  HubCalendarEventKind,
} from "@/lib/calendar/hub-events";
export {
  hubEventsToIcsInputs,
  sessionDateToWindow,
} from "@/lib/calendar/hub-events";

export interface AggregateHubCalendarOptions {
  includeGrievance: boolean;
  includeBumping: boolean;
  grievanceFilters?: GrievanceListFilters;
  bumpingFilters?: BumpingListFilters;
}

export async function aggregateHubCalendarEvents(
  opts: AggregateHubCalendarOptions,
): Promise<HubCalendarEvent[]> {
  const events: HubCalendarEvent[] = [];

  if (opts.includeGrievance && opts.grievanceFilters) {
    const grievances = await grievanceStore.list(opts.grievanceFilters);
    for (const g of grievances) {
      const meetings = await grievanceStore.listMeetings(g.id);
      for (const m of meetings) {
        events.push({
          id: m.id,
          kind: "grievance_meeting",
          title: m.title,
          startsAt: m.startsAt,
          endsAt: m.endsAt,
          location: m.location,
          description: m.description,
          unionId: m.unionId,
          localId: m.localId,
          href: `/app/grievances/${g.id}`,
          parentId: g.id,
        });
      }
    }
  }

  if (opts.includeBumping && opts.bumpingFilters) {
    const cases = await bumpingStore.list(opts.bumpingFilters);
    for (const c of cases) {
      const full = await bumpingStore.getById(c.id);
      if (!full) continue;
      for (const s of full.sessions) {
        const window = sessionDateToWindow(s.date);
        events.push({
          id: s.id,
          kind: "bumping_session",
          title: s.agenda || `Committee session · ${c.memberRef}`,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          description: s.attendees.length
            ? `Attendees: ${s.attendees.join(", ")}`
            : undefined,
          unionId: c.unionId,
          localId: c.localId,
          href: `/app/bumping/${c.id}`,
          parentId: c.id,
        });
      }
    }
  }

  return events.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
