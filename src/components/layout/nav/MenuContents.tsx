"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { NAV_MEGA_MENU_GRID_CLASS } from "@/lib/utils/flyout-geometry";
import {
  learnGroups,
  linkActive,
  visibleToolGroups,
  type NavGroup,
  type NavSubgroup,
} from "./nav-config";
import { GUIDE_CATALOG_PATH } from "@/lib/comms/guide-registry";

type MenuLinkGroupsProps = {
  groups: readonly NavGroup[];
  pathname: string;
  onNavigate: () => void;
  layout?: "list" | "mega";
};

function MenuItemLink({
  href,
  label,
  active,
  onNavigate,
  dense = false,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
  dense?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      tabIndex={-1}
      aria-current={active ? "page" : undefined}
      onClick={() => {
        // Defer unmount until after Next.js Link starts navigation (rAF can race).
        window.setTimeout(onNavigate, 0);
      }}
      className={cn(
        "block rounded-lg outline-none transition-colors duration-150",
        "hover:bg-opseu-blue/5 focus-visible:bg-opseu-blue/10 focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
        dense ? "px-2.5 py-1.5 text-sm" : "min-h-10 px-2.5 py-2 text-sm leading-snug",
        active && "bg-opseu-blue/10 font-semibold text-opseu-dark",
      )}
    >
      {label}
    </Link>
  );
}

function MegaFooterLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-2.5">
      <Link
        href={href}
        role="menuitem"
        tabIndex={-1}
        aria-current={active ? "page" : undefined}
        onClick={() => {
          window.setTimeout(onNavigate, 0);
        }}
        className={cn(
          "flex min-h-10 items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold outline-none transition-colors duration-150",
          "text-opseu-blue hover:bg-white focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
          active && "bg-white text-opseu-dark",
        )}
      >
        <span>{label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="h-3.5 w-3.5 shrink-0 opacity-70"
        >
          <path
            d="M4.25 2.5 7.75 6l-3.5 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </div>
  );
}

function MegaSubgroupLinks({
  subgroup,
  pathname,
  onNavigate,
}: {
  subgroup: NavSubgroup;
  pathname: string;
  onNavigate: () => void;
}) {
  const t = useTranslations("nav");
  return (
    <ul className="mt-1 space-y-0.5">
      {subgroup.links.map(({ href, key }) => (
        <li key={href}>
          <MenuItemLink
            href={href}
            label={t(key)}
            active={linkActive(pathname, href)}
            onNavigate={onNavigate}
          />
        </li>
      ))}
    </ul>
  );
}

function MegaSubgroups({
  subgroups,
  pathname,
  onNavigate,
}: {
  subgroups: readonly NavSubgroup[];
  pathname: string;
  onNavigate: () => void;
}) {
  const t = useTranslations("nav");
  return (
    <>
      <div className="hidden 2xl:block">
        {subgroups.map((subgroup) => (
          <div key={subgroup.labelKey} className="mt-3 first:mt-2">
            <p className="px-2.5 pb-1 text-[0.65rem] font-semibold tracking-wide text-gray-500">
              {t(subgroup.labelKey)}
            </p>
            <MegaSubgroupLinks
              subgroup={subgroup}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          </div>
        ))}
      </div>
      <div className="2xl:hidden">
        {subgroups.map((subgroup) => (
          <details key={subgroup.labelKey} className="mt-2">
            <summary className="cursor-pointer list-none rounded-lg px-2.5 py-1.5 text-[0.7rem] font-semibold tracking-wide text-gray-500 outline-none marker:content-none hover:bg-opseu-blue/5 focus-visible:bg-opseu-blue/10 focus-visible:ring-2 focus-visible:ring-opseu-blue/40 [&::-webkit-details-marker]:hidden">
              {t(subgroup.labelKey)}
            </summary>
            <MegaSubgroupLinks
              subgroup={subgroup}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          </details>
        ))}
      </div>
    </>
  );
}

export function MenuLinkGroups({
  groups,
  pathname,
  onNavigate,
  layout = "list",
}: MenuLinkGroupsProps) {
  const t = useTranslations("nav");

  if (layout === "mega") {
    return (
      <div className={NAV_MEGA_MENU_GRID_CLASS}>
        {groups.map((group) => (
          <div key={group.labelKey} className="min-w-0">
            <p className="border-b border-gray-100 px-2.5 pb-2 text-[0.7rem] font-semibold tracking-wide text-gray-500">
              {t(group.labelKey)}
            </p>
            {group.links.length > 0 ? (
              <ul className="mt-2 space-y-0.5">
                {group.links.map(({ href, key }) => (
                  <li key={href}>
                    <MenuItemLink
                      href={href}
                      label={t(key)}
                      active={linkActive(pathname, href)}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
            {group.subgroups ? (
              <MegaSubgroups
                subgroups={group.subgroups}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {groups.map((group, groupIndex) => (
        <div
          key={group.labelKey}
          className={cn(groupIndex > 0 && "mt-1 border-t border-gray-100 pt-1")}
        >
          <p className="px-3 py-1.5 text-[0.7rem] font-semibold tracking-wide text-gray-500">
            {t(group.labelKey)}
          </p>
          {group.links.map(({ href, key }) => (
            <MenuItemLink
              key={href}
              href={href}
              label={t(key)}
              active={linkActive(pathname, href)}
              onNavigate={onNavigate}
              dense
            />
          ))}
          {group.subgroups?.map((subgroup) => (
            <details key={subgroup.labelKey} className="mt-1">
              <summary className="cursor-pointer list-none px-3 py-1.5 text-[0.7rem] font-semibold tracking-wide text-gray-500 marker:content-none [&::-webkit-details-marker]:hidden">
                {t(subgroup.labelKey)}
              </summary>
              {subgroup.links.map(({ href, key }) => (
                <MenuItemLink
                  key={href}
                  href={href}
                  label={t(key)}
                  active={linkActive(pathname, href)}
                  onNavigate={onNavigate}
                  dense
                />
              ))}
            </details>
          ))}
        </div>
      ))}
    </>
  );
}

export function LearnMenuContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  const t = useTranslations("nav");
  const allActive = pathname === GUIDE_CATALOG_PATH;

  return (
    <div className="w-full min-w-0">
      <MenuLinkGroups
        groups={learnGroups}
        pathname={pathname}
        onNavigate={onNavigate}
        layout="mega"
      />
      <MegaFooterLink
        href={GUIDE_CATALOG_PATH}
        label={t("allGuides")}
        active={allActive}
        onNavigate={onNavigate}
      />
    </div>
  );
}

export function ToolsMegaMenuContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  const t = useTranslations("nav");
  const { data: session, status } = useSession();
  const authenticated =
    status === "authenticated" && Boolean(session?.user);
  const groups = visibleToolGroups({
    officerHubPublic: isOfficerHubPublic(),
    authenticated,
  });
  const allActive = pathname === "/tools";

  return (
    <div className="w-full min-w-0">
      <MenuLinkGroups
        groups={groups}
        pathname={pathname}
        onNavigate={onNavigate}
        layout="mega"
      />
      <MegaFooterLink
        href="/tools"
        label={t("allTools")}
        active={allActive}
        onNavigate={onNavigate}
      />
    </div>
  );
}
