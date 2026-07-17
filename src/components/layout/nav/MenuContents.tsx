"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  learnGroups,
  linkActive,
  toolGroups,
  type NavGroup,
} from "./nav-config";

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
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      tabIndex={-1}
      aria-current={active ? "page" : undefined}
      onClick={() => {
        requestAnimationFrame(onNavigate);
      }}
      className={cn(
        "block rounded-md px-2 py-2 outline-none hover:bg-opseu-blue/5 focus-visible:bg-opseu-blue/10 focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
        active && "bg-opseu-blue/10 font-semibold text-opseu-dark",
      )}
    >
      {label}
    </Link>
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
      <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((group) => (
          <div key={group.labelKey} className="min-w-[10.5rem]">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t(group.labelKey)}
            </p>
            <ul className="mt-0.5">
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
          <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t(group.labelKey)}
          </p>
          {group.links.map(({ href, key }) => (
            <MenuItemLink
              key={href}
              href={href}
              label={t(key)}
              active={linkActive(pathname, href)}
              onNavigate={onNavigate}
            />
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
  return (
    <MenuLinkGroups
      groups={learnGroups}
      pathname={pathname}
      onNavigate={onNavigate}
      layout="list"
    />
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
  const allActive = pathname === "/tools";

  return (
    <div className="w-[min(90vw,40rem)] xl:w-[min(90vw,52rem)]">
      <MenuLinkGroups
        groups={toolGroups}
        pathname={pathname}
        onNavigate={onNavigate}
        layout="mega"
      />
      <div className="border-t border-gray-100 px-3 py-2">
        <Link
          href="/tools"
          role="menuitem"
          tabIndex={-1}
          aria-current={allActive ? "page" : undefined}
          onClick={() => {
            requestAnimationFrame(onNavigate);
          }}
          className={cn(
            "block rounded-md px-2 py-2 text-sm font-semibold text-opseu-blue outline-none hover:bg-opseu-blue/5 focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
            allActive && "bg-opseu-blue/10 text-opseu-dark",
          )}
        >
          {t("allTools")}
        </Link>
      </div>
    </div>
  );
}
