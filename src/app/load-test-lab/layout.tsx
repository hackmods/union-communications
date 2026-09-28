import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Load Test Lab | UnionOps",
  description:
    "On-box capacity testing console for operators — configure and run load against this host.",
  robots: { index: false, follow: false },
};

export default function LoadTestLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="m-0 min-h-full bg-zinc-950 antialiased">{children}</body>
    </html>
  );
}
