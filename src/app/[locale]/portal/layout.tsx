import { DemoSiteBanner } from "@/components/hub/DemoSiteBanner";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DemoSiteBanner />
      <div className={cn(PAGE_SHELL.wide, "py-6 md:py-8")}>{children}</div>
    </>
  );
}
