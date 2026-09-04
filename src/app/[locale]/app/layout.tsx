import type { Metadata } from "next";
import { HubBannerStack } from "@/components/hub/HubBannerStack";
import { MfaPolicyProvider } from "@/components/hub/MfaPolicyProvider";
import { TotpEnrollmentGate } from "@/components/hub/TotpEnrollmentGate";
import { HubNav } from "@/components/hub/HubNav";
import { TenantLiveProvider } from "@/components/hub/TenantLiveProvider";
import { isMfaEnabled } from "@/lib/auth/mfa-policy";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await hydrateTenantOverlayFromPostgres();
  const mfaEnabled = isMfaEnabled();
  return (
    <MfaPolicyProvider mfaEnabled={mfaEnabled}>
      <TotpEnrollmentGate>
        <TenantLiveProvider>
          <HubBannerStack />
          <HubNav />
          {/* Body uses `wide` (not chrome): avoid stretched empty margins on phone/tablet. */}
          <div className={cn(PAGE_SHELL.wide, "py-4 sm:py-6 md:py-8")}>
            {children}
          </div>
        </TenantLiveProvider>
      </TotpEnrollmentGate>
    </MfaPolicyProvider>
  );
}
