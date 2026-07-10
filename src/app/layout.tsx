import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local Union Support Hub",
  description:
    "Professional tools for any local union — communications, grievances, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
