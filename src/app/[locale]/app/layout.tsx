import type { Metadata } from "next";
import { DemoSiteBanner } from "@/components/hub/DemoSiteBanner";
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
    <>
      <DemoSiteBanner />
      <HubNav />
      <div className={cn(PAGE_SHELL.chrome, "py-8")}>{children}</div>
    </>
  );
}
