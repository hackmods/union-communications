import { DemoSiteBanner } from "@/components/hub/DemoSiteBanner";
import { HubNav } from "@/components/hub/HubNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DemoSiteBanner />
      <HubNav />
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </>
  );
}
