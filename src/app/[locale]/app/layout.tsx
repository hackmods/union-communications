import type { Metadata } from "next";
import { DemoSiteBanner } from "@/components/hub/DemoSiteBanner";
import { MemoryDataBanner } from "@/components/hub/MemoryDataBanner";
import { MeetingReminderBanner } from "@/components/hub/MeetingReminderBanner";
import { TotpEnrollmentGate } from "@/components/hub/TotpEnrollmentGate";
import { HubNav } from "@/components/hub/HubNav";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TotpEnrollmentGate>
      <DemoSiteBanner />
      <MemoryDataBanner />
      <MeetingReminderBanner />
      <HubNav />
      {/* Body uses `wide` (not chrome): avoid stretched empty margins on phone/tablet. */}
      <div className={cn(PAGE_SHELL.wide, "py-4 sm:py-6 md:py-8")}>
        {children}
      </div>
    </TotpEnrollmentGate>
  );
}
