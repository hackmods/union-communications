/**
 * Officer tools catalog — same items as HubNav, reused on the dashboard so
 * the kit is not a leftover card of four links.
 */
import { canAccessBumpingModule } from "@/lib/bumping/access";
import { canAccessCommitteesModule } from "@/lib/committees/access";
import { canAccessElectionsModule } from "@/lib/elections/access";
import { canAccessExpensesModule } from "@/lib/expenses/access";
import {
  canAccessGrievanceModule,
  canCrossLocalGrievance,
  isElevatedGrievanceRole,
} from "@/lib/grievance/access";
import { canInitiateHandoff } from "@/lib/handoff/package";
import { canAccessMeetingsModule } from "@/lib/meetings/access";
import { canAccessMinutesModule } from "@/lib/minutes/access";
import { canAccessOfficerRoster } from "@/lib/officers/access";
import { canAccessPollsModule } from "@/lib/polls/access";
import {
  canManageInvites,
  canManageTenantOnboarding,
} from "@/lib/tenant/access";
import { canAccessTravelModule } from "@/lib/travel/access";
import type { HubModule, UserRole } from "@/types/tenant";
import { HUB_TOOL_GROUPS, type HubToolLink } from "./hub-nav-model";

export type HubToolLabelKey =
  | "calendarLink"
  | "overdueLink"
  | "snippetsLink"
  | "marketplaceLink"
  | "documentsLink"
  | "hybridLink"
  | "minutesLink"
  | "officersLink"
  | "committeesLink"
  | "electionsLink"
  | "meetingsLink"
  | "pollsLink"
  | "ledgerLink"
  | "travelLink"
  | "expensesLink"
  | "handoffLink"
  | "invitesLink"
  | "tenantOnboardingLink"
  | "reportsLink"
  | "auditLink"
  | "siteFeedbackInboxLink";

export type HubToolBlurbKey =
  | "calendar"
  | "overdue"
  | "snippets"
  | "marketplace"
  | "documents"
  | "hybrid"
  | "minutes"
  | "officers"
  | "committees"
  | "elections"
  | "meetings"
  | "polls"
  | "ledger"
  | "travel"
  | "expenses"
  | "handoff"
  | "invites"
  | "onboarding"
  | "reports"
  | "audit"
  | "feedback";

export type HubToolAccess = {
  calendar: boolean;
  grievance: boolean;
  minutes: boolean;
  officers: boolean;
  committees: boolean;
  elections: boolean;
  meetings: boolean;
  polls: boolean;
  ledger: boolean;
  travel: boolean;
  expenses: boolean;
  handoff: boolean;
  invites: boolean;
  tenantOnboarding: boolean;
  reports: boolean;
  audit: boolean;
  siteFeedbackInbox: boolean;
};

export type HubToolDef = {
  href: string;
  labelKey: HubToolLabelKey;
  blurbKey: HubToolBlurbKey;
  visible: (access: HubToolAccess) => boolean;
};

export const HUB_TOOL_CATALOG: readonly HubToolDef[] = [
  {
    href: "/app/calendar",
    labelKey: "calendarLink",
    blurbKey: "calendar",
    visible: (a) => a.calendar,
  },
  {
    href: "/app/overdue",
    labelKey: "overdueLink",
    blurbKey: "overdue",
    visible: (a) => a.grievance,
  },
  {
    href: "/app/snippets",
    labelKey: "snippetsLink",
    blurbKey: "snippets",
    visible: (a) => a.grievance,
  },
  {
    href: "/app/marketplace",
    labelKey: "marketplaceLink",
    blurbKey: "marketplace",
    visible: (a) => a.grievance,
  },
  {
    href: "/app/documents",
    labelKey: "documentsLink",
    blurbKey: "documents",
    visible: (a) => a.grievance,
  },
  {
    href: "/app/hybrid",
    labelKey: "hybridLink",
    blurbKey: "hybrid",
    visible: (a) => a.grievance,
  },
  {
    href: "/app/minutes",
    labelKey: "minutesLink",
    blurbKey: "minutes",
    visible: (a) => a.minutes,
  },
  {
    href: "/app/officers",
    labelKey: "officersLink",
    blurbKey: "officers",
    visible: (a) => a.officers,
  },
  {
    href: "/app/committees",
    labelKey: "committeesLink",
    blurbKey: "committees",
    visible: (a) => a.committees,
  },
  {
    href: "/app/elections",
    labelKey: "electionsLink",
    blurbKey: "elections",
    visible: (a) => a.elections,
  },
  {
    href: "/app/meetings",
    labelKey: "meetingsLink",
    blurbKey: "meetings",
    visible: (a) => a.meetings,
  },
  {
    href: "/app/polls",
    labelKey: "pollsLink",
    blurbKey: "polls",
    visible: (a) => a.polls,
  },
  {
    href: "/app/ledger",
    labelKey: "ledgerLink",
    blurbKey: "ledger",
    visible: (a) => a.ledger,
  },
  {
    href: "/app/travel",
    labelKey: "travelLink",
    blurbKey: "travel",
    visible: (a) => a.travel,
  },
  {
    href: "/app/expenses",
    labelKey: "expensesLink",
    blurbKey: "expenses",
    visible: (a) => a.expenses,
  },
  {
    href: "/app/handoff",
    labelKey: "handoffLink",
    blurbKey: "handoff",
    visible: (a) => a.handoff,
  },
  {
    href: "/app/invites",
    labelKey: "invitesLink",
    blurbKey: "invites",
    visible: (a) => a.invites,
  },
  {
    href: "/app/onboarding",
    labelKey: "tenantOnboardingLink",
    blurbKey: "onboarding",
    visible: (a) => a.tenantOnboarding,
  },
  {
    href: "/app/reports",
    labelKey: "reportsLink",
    blurbKey: "reports",
    visible: (a) => a.reports,
  },
  {
    href: "/app/audit",
    labelKey: "auditLink",
    blurbKey: "audit",
    visible: (a) => a.audit,
  },
  {
    href: "/app/feedback",
    labelKey: "siteFeedbackInboxLink",
    blurbKey: "feedback",
    visible: (a) => a.siteFeedbackInbox,
  },
] as const;

export function resolveHubToolAccess(
  roles: UserRole[],
  enabledModules: HubModule[],
): HubToolAccess {
  const grievance = canAccessGrievanceModule(roles);
  const bumping =
    canAccessBumpingModule(roles) && enabledModules.includes("bumping");
  return {
    calendar: grievance || bumping,
    grievance,
    minutes: canAccessMinutesModule(roles),
    officers: canAccessOfficerRoster(roles),
    committees: canAccessCommitteesModule(roles),
    elections: canAccessElectionsModule(roles),
    meetings: canAccessMeetingsModule(roles),
    polls: canAccessPollsModule(roles),
    ledger:
      roles.includes("local_president") ||
      roles.includes("local_exec") ||
      canCrossLocalGrievance(roles),
    travel: canAccessTravelModule(roles),
    expenses: canAccessExpensesModule(roles),
    handoff: canInitiateHandoff(roles),
    invites: canManageInvites(roles),
    tenantOnboarding: canManageTenantOnboarding(roles),
    reports: isElevatedGrievanceRole(roles),
    audit:
      canCrossLocalGrievance(roles) ||
      roles.includes("local_president") ||
      roles.includes("local_exec"),
    siteFeedbackInbox: roles.includes("platform_admin"),
  };
}

export function listVisibleHubTools(access: HubToolAccess): HubToolDef[] {
  return HUB_TOOL_CATALOG.filter((item) => item.visible(access));
}

export function listHubToolLinks(
  access: HubToolAccess,
  label: (key: HubToolLabelKey) => string,
): HubToolLink[] {
  return listVisibleHubTools(access).map((item) => ({
    href: item.href,
    label: label(item.labelKey),
  }));
}

/** Guard: every grouped nav href must have a catalog row (and vice versa). */
export function hubToolCatalogHrefs(): string[] {
  return HUB_TOOL_CATALOG.map((item) => item.href);
}

export function hubToolGroupHrefs(): string[] {
  return HUB_TOOL_GROUPS.flatMap((group) => [...group.hrefs]);
}
