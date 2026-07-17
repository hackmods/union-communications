import type { Metadata } from "next";
import "./globals.css";
import {
  APPLE_TOUCH_ICON_PATH,
  FAVICON_ICO_PATH,
  FAVICON_SVG_PATH,
  ICON_16_PATH,
  ICON_32_PATH,
  ICON_48_PATH,
  ICON_192_PATH,
  ICON_512_PATH,
  OG_IMAGE_PATH,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  TWITTER_IMAGE_PATH,
} from "@/lib/seo/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      // SVG first — supports prefers-color-scheme black/white contrast
      { url: FAVICON_SVG_PATH, type: "image/svg+xml" },
      { url: ICON_16_PATH, sizes: "16x16", type: "image/png" },
      { url: ICON_32_PATH, sizes: "32x32", type: "image/png" },
      // 48×48 satisfies Google Search’s multiple-of-48 requirement
      { url: ICON_48_PATH, sizes: "48x48", type: "image/png" },
      { url: FAVICON_ICO_PATH, sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: ICON_192_PATH, sizes: "192x192", type: "image/png" },
      { url: ICON_512_PATH, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: APPLE_TOUCH_ICON_PATH, sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Solidarity.`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [TWITTER_IMAGE_PATH],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
