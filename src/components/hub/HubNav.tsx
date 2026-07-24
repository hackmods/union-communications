"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getVisibleModules } from "@/lib/modules/registry";
import { getTenantContext } from "@/lib/tenant/loader";
import { canInitiateHandoff } from "@/lib/handoff/package";
import {
  canManageInvites,
  canManageTenantOnboarding,
} from "@/lib/tenant/access";
import { canAccessBumpingModule } from "@/lib/bumping/access";
import {
  canAccessGrievanceModule,
  canCrossLocalGrievance,
  isElevatedGrievanceRole,
} from "@/lib/grievance/access";
import { canAccessCommitteesModule } from "@/lib/committees/access";
import { canAccessElectionsModule } from "@/lib/elections/access";
import { canAccessMinutesModule } from "@/lib/minutes/access";
import { canAccessOfficerRoster } from "@/lib/officers/access";
import { canAccessTravelModule } from "@/lib/travel/access";
import { canAccessPollsModule } from "@/lib/polls/access";
import { canAccessMeetingsModule } from "@/lib/meetings/access";
import type { HubModule, UserRole } from "@/types/tenant";
import { cn } from "@/lib/utils";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { Emoji } from "@/components/ui/Emoji";
import { HubContextSwitcher } from "@/components/hub/HubContextSwitcher";
import { getMenuItems } from "@/components/layout/nav/focusables";

export function HubNav() {
  const { data: session, status } = useSession();
  const t = useTranslations("hub");
  const pathname = usePathname();

  // Login sits under /app; hide hub chrome until the session is ready.
  if (status !== "authenticated" || !session?.user) return null;

  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  const enabledModules: HubModule[] =
    tenant?.union.enabledModules ?? ["comms"];
  const roles = (session.user.roles ?? []) as UserRole[];
  const modules = getVisibleModules(enabledModules, roles);
  const mfaOk = !!session.user.mfaVerified;
  const hasGrievance = canAccessGrievanceModule(roles);
  const hasBumping =
    canAccessBumpingModule(roles) && enabledModules.includes("bumping");
  const showCalendar = hasGrievance || hasBumping;
  const showHandoff = canInitiateHandoff(roles);
  const showInvites = canManageInvites(roles);
  const showTenantOnboarding = canManageTenantOnboarding(roles);
  const showAudit =
    canCrossLocalGrievance(roles) ||
    roles.includes("local_president") ||
    roles.includes("local_exec");
  const showReports = isElevatedGrievanceRole(roles);
  const showMinutes = canAccessMinutesModule(roles);
  const showOfficers = canAccessOfficerRoster(roles);
  const showCommittees = canAccessCommitteesModule(roles);
  const showElections = canAccessElectionsModule(roles);
  const showTravel = canAccessTravelModule(roles);
  const showPolls = canAccessPollsModule(roles);
  const showMeetings = canAccessMeetingsModule(roles);
  const showLedger =
    roles.includes("local_president") ||
    roles.includes("local_exec") ||
    canCrossLocalGrievance(roles);

  const toolLinks = [
    showCalendar && {
      href: "/app/calendar",
      label: t("calendarLink"),
    },
    hasGrievance && {
      href: "/app/overdue",
      label: t("overdueLink"),
    },
    hasGrievance && {
      href: "/app/snippets",
      label: t("snippetsLink"),
    },
    hasGrievance && {
      href: "/app/marketplace",
      label: t("marketplaceLink"),
    },
    hasGrievance && {
      href: "/app/documents",
      label: t("documentsLink"),
    },
    showMinutes && {
      href: "/app/minutes",
      label: t("minutesLink"),
    },
    showOfficers && {
      href: "/app/officers",
      label: t("officersLink"),
    },
    showCommittees && {
      href: "/app/committees",
      label: t("committeesLink"),
    },
    showElections && {
      href: "/app/elections",
      label: t("electionsLink"),
    },
    showHandoff && {
      href: "/app/handoff",
      label: t("handoffLink"),
    },
    showInvites && {
      href: "/app/invites",
      label: t("invitesLink"),
    },
    showTenantOnboarding && {
      href: "/app/onboarding",
      label: t("tenantOnboardingLink"),
    },
    hasGrievance && {
      href: "/app/hybrid",
      label: t("hybridLink"),
    },
    showLedger && {
      href: "/app/ledger",
      label: t("ledgerLink"),
    },
    showTravel && {
      href: "/app/travel",
      label: t("travelLink"),
    },
    showPolls && {
      href: "/app/polls",
      label: t("pollsLink"),
    },
    showMeetings && {
      href: "/app/meetings",
      label: t("meetingsLink"),
    },
    showReports && {
      href: "/app/reports",
      label: t("reportsLink"),
    },
    showAudit && {
      href: "/app/audit",
      label: t("auditLink"),
    },
  ].filter(Boolean) as { href: string; label: string }[];

  const linkClass = (extra?: string) =>
    cn(
      "inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-2 py-1 hover:bg-white",
      extra,
    );

  return (
    <nav
      className="border-b border-gray-200 bg-gray-50"
      aria-label={t("navLabel")}
    >
      <div
        className={cn(
          PAGE_SHELL.chrome,
          "flex min-w-0 items-center gap-2 overflow-x-auto py-2 text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        <Link
          href="/app"
          aria-current={pathname === "/app" ? "page" : undefined}
          className="shrink-0 font-semibold whitespace-nowrap text-opseu-dark hover:underline"
        >
          {t("title")}
        </Link>
        <span className="shrink-0 text-gray-400" aria-hidden="true">
          |
        </span>
        <HubContextSwitcher />
        <span className="hidden min-w-2 flex-1 md:block" />
        {modules.map((mod) => {
          const href = mod.href.startsWith("/app") ? mod.href : "/";
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={mod.id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={linkClass(
                cn(
                  mod.requiresMfa && !mfaOk ? "opacity-60" : undefined,
                  active && "bg-white font-semibold text-opseu-dark",
                ),
              )}
            >
              <Emoji id={mod.emojiId} /> {t(`modules.${mod.nameKey}`)}
            </Link>
          );
        })}
        {toolLinks.length > 0 && (
          <HubToolsMenu
            label={t("toolsMenu")}
            links={toolLinks}
            pathname={pathname}
            dimmed={!mfaOk}
          />
        )}
        <Link
          href="/app/mfa"
          aria-current={pathname.startsWith("/app/mfa") ? "page" : undefined}
          className={linkClass("text-opseu-blue")}
        >
          {mfaOk ? t("mfaOk") : t("mfaRequired")}
        </Link>
      </div>
    </nav>
  );
}

function HubToolsMenu({
  label,
  links,
  pathname,
  dimmed,
}: {
  label: string;
  links: { href: string; label: string }[];
  pathname: string;
  dimmed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const toolsActive = links.some(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`),
  );

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    getMenuItems(menuRef.current)[0]?.focus();
  }, [open]);

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const panel = menuRef.current;
    if (!panel) return;
    const items = getMenuItems(panel);
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index < 0 ? 0 : index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[index <= 0 ? items.length - 1 : index - 1]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 hover:bg-white",
          dimmed && "opacity-60",
          (open || toolsActive) && "bg-white font-semibold text-opseu-dark",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {label}
        <span
          aria-hidden="true"
          className={cn(
            "text-[0.65em] transition-transform duration-150",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onPanelKeyDown}
          className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-lg border border-gray-200 bg-white py-1 shadow-md"
        >
          {links.map((link) => {
            const active =
              pathname === link.href ||
              pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                tabIndex={-1}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  requestAnimationFrame(() => setOpen(false));
                }}
                className={cn(
                  "block px-3 py-2 text-sm outline-none hover:bg-gray-50 focus-visible:bg-opseu-blue/10 focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
                  active && "bg-opseu-blue/10 font-semibold text-opseu-dark",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
