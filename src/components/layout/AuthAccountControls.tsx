"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSessionChrome } from "@/components/auth/useSessionChrome";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { canAccessPortal } from "@/lib/portal/access";
import { getTenantContext } from "@/lib/tenant/loader";
import type { UserRole } from "@/types/tenant";
import { cn } from "@/lib/utils";
import { PlatformOperatorAccountLinks } from "@/components/platform/PlatformOperatorAccountLinks";

type AuthAccountControlsProps = {
  /** Compact row for desktop header; stacked for mobile drawer. */
  layout?: "inline" | "stack";
  /** Officer Hub is rendered as a first-class destination in the public shell. */
  showHubLink?: boolean;
  /** Local Portal is rendered beside Officer Hub in the public shell. */
  showPortalLink?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function AuthAccountControls({
  layout = "inline",
  showHubLink = true,
  showPortalLink = true,
  onNavigate,
  className,
}: AuthAccountControlsProps) {
  const { session, authenticated, coldLoading } = useSessionChrome();
  const t = useTranslations("hub");
  const pathname = usePathname();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const showHub = authenticated || isOfficerHubPublic();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const tenant = session?.user?.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  const portalEnabled = Boolean(tenant?.union.enabledModules.includes("portal"));
  const showPortal =
    showPortalLink &&
    authenticated &&
    portalEnabled &&
    canAccessPortal(roles);

  const portalCurrent = pathname.startsWith("/portal");
  const hubCurrent = pathname.startsWith("/app");
  const profileActive = pathname.startsWith("/app/profile");

  // While session resolves on cold start, keep reserved account chrome so hard
  // navigations do not look logged-out. JWT refresh keeps session.user — do
  // not blank Profile/Sign out. Only omit the cluster when we know the user
  // is out and Hub/Portal links are not shown here.
  if (
    !coldLoading &&
    (!showHub || !showHubLink) &&
    !showPortal &&
    !authenticated
  ) {
    return null;
  }

  /** When Hub/Portal live in the main nav, account cluster keeps profile/sign-out only. */
  const hubPrimaryClass = (current: boolean) =>
    cn(
      layout === "inline"
        ? "rounded-lg bg-opseu-blue px-3 py-1.5 font-semibold text-white transition-colors duration-150 hover:bg-opseu-dark"
        : "flex min-h-11 items-center justify-center rounded-lg bg-opseu-blue px-3 py-2 font-semibold text-white hover:bg-opseu-dark",
      current && "bg-opseu-dark",
    );

  const portalOutlineClass = (current: boolean) =>
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

  const hubLink = showHub && showHubLink ? (
    <Link
      href="/app"
      onClick={onNavigate}
      aria-current={hubCurrent && !profileActive ? "page" : undefined}
      className={hubPrimaryClass(hubCurrent)}
    >
      {t("hubLink")}
    </Link>
  ) : null;

  const portalLink = showPortal ? (
    <Link
      href="/portal"
      onClick={onNavigate}
      aria-current={portalCurrent ? "page" : undefined}
      className={portalOutlineClass(portalCurrent)}
    >
      {t("portalLink")}
    </Link>
  ) : null;

  const accountSkeleton =
    coldLoading ? (
      <div
        className={cn(
          layout === "inline"
            ? "flex items-center gap-1"
            : "mt-1 flex flex-col gap-2",
        )}
        role="status"
        aria-busy="true"
        aria-label={t("sessionLoading")}
        data-testid="auth-account-loading"
      >
        <span
          aria-hidden
          className={cn(
            "inline-block animate-pulse rounded-md bg-slate-200",
            layout === "inline" ? "h-8 w-20" : "h-11 w-full",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "inline-block animate-pulse rounded-md bg-slate-200",
            layout === "inline" ? "h-8 w-16" : "h-11 w-full",
          )}
        />
      </div>
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
      {hubLink}
      {portalLink}

      {authenticated ? (
        <>
          <div
            className={cn(
              layout === "inline" ? "flex items-start gap-1" : "flex flex-col gap-1",
            )}
          >
            <Link
              href="/app/profile"
              onClick={onNavigate}
              aria-current={profileActive ? "page" : undefined}
              className={cn(
                secondaryClass,
                "inline-flex items-center gap-2",
                profileActive && "bg-opseu-blue/10 font-semibold",
              )}
              data-testid="auth-profile-link"
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
            {layout === "stack" ? (
              <PlatformOperatorAccountLinks
                layout={layout}
                onNavigate={onNavigate}
              />
            ) : null}
          </div>
          <button
            type="button"
            className={secondaryClass}
            data-testid="auth-sign-out"
            onClick={() => {
              onNavigate?.();
              void signOut({ callbackUrl: "/" });
            }}
          >
            {t("signOut")}
          </button>
        </>
      ) : (
        accountSkeleton
      )}
    </div>
  );
}
