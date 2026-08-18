"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { canAccessPortal, prefersPortalHome } from "@/lib/portal/access";
import { getTenantContext } from "@/lib/tenant/loader";
import type { UserRole } from "@/types/tenant";
import { cn } from "@/lib/utils";

type AuthAccountControlsProps = {
  /** Compact row for desktop header; stacked for mobile drawer. */
  layout?: "inline" | "stack";
  onNavigate?: () => void;
  className?: string;
};

export function AuthAccountControls({
  layout = "inline",
  onNavigate,
  className,
}: AuthAccountControlsProps) {
  const { data: session, status } = useSession();
  const t = useTranslations("hub");
  const pathname = usePathname();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const authenticated = status === "authenticated" && Boolean(session?.user);
  const showHub = authenticated || isOfficerHubPublic();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const tenant = session?.user?.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  const portalEnabled = Boolean(tenant?.union.enabledModules.includes("portal"));
  const showPortal =
    authenticated && portalEnabled && canAccessPortal(roles);

  const portalCurrent = pathname.startsWith("/portal");
  const hubCurrent = pathname.startsWith("/app");
  const profileActive = pathname.startsWith("/app/profile");
  const memberPrefersPortal = prefersPortalHome(roles);
  const portalFilled =
    showPortal && (portalCurrent || (!hubCurrent && memberPrefersPortal));
  const hubFilled = showHub && !portalFilled;
  const hubFirst = !memberPrefersPortal && !portalCurrent;

  if (!showHub && !showPortal && !authenticated) return null;

  const filledClass = (current: boolean) =>
    cn(
      layout === "inline"
        ? "rounded-lg bg-opseu-blue px-3 py-1.5 font-semibold text-white transition-colors duration-150 hover:bg-opseu-dark"
        : "flex min-h-11 items-center justify-center rounded-lg bg-opseu-blue px-3 py-2 font-semibold text-white hover:bg-opseu-dark",
      current && "bg-opseu-dark",
    );

  const outlineClass = (current: boolean) =>
    cn(
      layout === "inline"
        ? "rounded-lg border border-opseu-blue/40 px-3 py-1.5 font-semibold text-opseu-blue transition-colors duration-150 hover:bg-opseu-blue/5"
        : "flex min-h-11 items-center justify-center rounded-lg border border-opseu-blue/40 px-3 py-2 font-semibold text-opseu-blue hover:bg-opseu-blue/5",
      current && "border-opseu-blue bg-opseu-blue/10 text-opseu-dark",
    );

  const secondaryClass =
    layout === "inline"
      ? "rounded-md px-2 py-1 text-sm font-medium text-opseu-dark transition-colors hover:bg-opseu-blue/5"
      : "flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium text-opseu-dark hover:bg-opseu-blue/5";

  const hubLink = showHub ? (
    <Link
      href="/app"
      onClick={onNavigate}
      aria-current={hubCurrent && !profileActive ? "page" : undefined}
      className={hubFilled ? filledClass(hubCurrent) : outlineClass(hubCurrent)}
    >
      {t("hubLink")}
    </Link>
  ) : null;

  const portalLink = showPortal ? (
    <Link
      href="/portal"
      onClick={onNavigate}
      aria-current={portalCurrent ? "page" : undefined}
      className={
        portalFilled ? filledClass(portalCurrent) : outlineClass(portalCurrent)
      }
    >
      {t("portalLink")}
    </Link>
  ) : null;

  return (
    <div
      className={cn(
        layout === "inline"
          ? "flex items-center gap-1"
          : "mt-4 flex flex-col gap-2",
        className,
      )}
    >
      {hubFirst ? (
        <>
          {hubLink}
          {portalLink}
        </>
      ) : (
        <>
          {portalLink}
          {hubLink}
        </>
      )}

      {authenticated ? (
        <>
          <Link
            href="/app/profile"
            onClick={onNavigate}
            aria-current={profileActive ? "page" : undefined}
            className={cn(
              secondaryClass,
              "inline-flex items-center gap-2",
              profileActive && "bg-opseu-blue/10 font-semibold",
            )}
          >
            {!avatarFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/api/profile/avatar"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-gray-200"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-opseu-blue/15 text-xs font-semibold text-opseu-dark"
              >
                {(session?.user?.name ?? session?.user?.email ?? "?")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
            <span>{t("profileLink")}</span>
          </Link>
          <button
            type="button"
            className={secondaryClass}
            onClick={() => {
              onNavigate?.();
              void signOut({ callbackUrl: "/" });
            }}
          >
            {t("signOut")}
          </button>
        </>
      ) : null}
    </div>
  );
}
