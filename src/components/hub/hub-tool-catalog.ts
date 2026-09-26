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
  canManageLocalModules,
  canManageTenantOnboarding,
} from "@/lib/tenant/access";
import { canManageOfficerLearningReport } from "@/lib/officer-learning/access";
import { canAccessTravelModule } from "@/lib/travel/access";
import type { HubModule, UserRole } from "@/types/tenant";
import { HUB_TOOL_GROUPS, type HubToolLink } from "./hub-nav-model";

export type HubToolLabelKey =
  | "calendarLink"
  | "overdueLink"
  | "stewardGuidesLink"
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
  | "presidentConfigLink"
  | "reportsLink"
  | "officerLearningLink"
  | "auditLink"
  | "siteFeedbackInboxLink";

export type HubToolBlurbKey =
  | "calendar"
  | "overdue"
  | "stewardGuides"
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
  | "configuration"
  | "reports"
  | "officerLearning"
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
  presidentConfig: boolean;
  reports: boolean;
  officerLearning: boolean;
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
    href: "/app/steward-guides",
    labelKey: "stewardGuidesLink",
    blurbKey: "stewardGuides",
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
    href: "/app/officer-learning",
    labelKey: "officerLearningLink",
    blurbKey: "officerLearning",
    visible: (a) => a.officerLearning,
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
    href: "/app/configuration",
    labelKey: "presidentConfigLink",
    blurbKey: "configuration",
    visible: (a) => a.presidentConfig,
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

/** Admin / setup hrefs that stay visible from roles alone when casework modules are off. */
export const HUB_SETUP_TOOL_HREFS = [
  "/app/configuration",
  "/app/invites",
  "/app/onboarding",
] as const;

export function isHubSetupToolHref(href: string): boolean {
  return (HUB_SETUP_TOOL_HREFS as readonly string[]).includes(href);
}

export function resolveHubToolAccess(
  roles: UserRole[],
  enabledModules: HubModule[],
  scope?: { unionId?: string | null; localId?: string | null },
): HubToolAccess {
  const grievanceRole = canAccessGrievanceModule(roles);
  const grievance =
    grievanceRole && enabledModules.includes("grievance");
  const bumping =
    canAccessBumpingModule(roles) && enabledModules.includes("bumping");
  const hasUnion = Boolean(scope?.unionId);
  const hasLocal = Boolean(scope?.localId);
  // Hide local-scoped tools when the session cannot open them (silent /app redirect).
  const localCasework = hasUnion && hasLocal;
  return {
    calendar: localCasework && (grievance || bumping),
    grievance: localCasework && grievance,
    minutes: localCasework && canAccessMinutesModule(roles),
    officers: localCasework && canAccessOfficerRoster(roles),
    committees: localCasework && canAccessCommitteesModule(roles),
    elections: localCasework && canAccessElectionsModule(roles),
    meetings: hasUnion && canAccessMeetingsModule(roles),
    polls: localCasework && canAccessPollsModule(roles),
    ledger:
      localCasework &&
      (roles.includes("local_president") ||
        roles.includes("local_exec") ||
        canCrossLocalGrievance(roles)),
    travel: localCasework && canAccessTravelModule(roles),
    expenses: localCasework && canAccessExpensesModule(roles),
    handoff: localCasework && canInitiateHandoff(roles),
    // Setup chrome is role-gated only — visible while tenant loads or modules are off.
    invites: canManageInvites(roles),
    tenantOnboarding: canManageTenantOnboarding(roles),
    presidentConfig: canManageLocalModules(roles),
    reports: localCasework && isElevatedGrievanceRole(roles),
    officerLearning: localCasework && canManageOfficerLearningReport(roles),
    audit:
      localCasework &&
      (canCrossLocalGrievance(roles) ||
        roles.includes("local_president") ||
        roles.includes("local_exec")),
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
