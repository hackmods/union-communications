import type { Metadata } from "next";
import "../globals.css";
import "./viewport-lab.css";

export const metadata: Metadata = {
  title: "Viewport Lab | UnionOps",
  description:
    "Operator device frame for Muse and agents — same-origin responsive QA.",
  robots: { index: false, follow: false },
};

export default function ViewportLabLayout({
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
