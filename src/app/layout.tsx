import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPSEU Local Social Media Toolbox",
  description:
    "Guides, templates, and image tools for OPSEU local union social media",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
