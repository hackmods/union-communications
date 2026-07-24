"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

/**
 * When AUTH_MFA_ENABLED and AUTH_MFA_MODE=totp and the signed-in user has no
 * secret, send them to /app/mfa/setup before other Hub surfaces.
 */
export function TotpEnrollmentGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.includes("/app/mfa") || pathname.includes("/app/login")) {
      return;
    }
    let cancelled = false;
    void fetch("/api/mfa/status")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: { enabled?: boolean; needsEnrollment?: boolean } | null) => {
          if (
            !cancelled &&
            data?.enabled &&
            data?.needsEnrollment
          ) {
            router.replace("/app/mfa/setup");
          }
        },
      )
      .catch(() => {
        /* ignore — status is best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return <>{children}</>;
}
