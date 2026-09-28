import type { Metadata } from "next";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { isPulsePollAuthoringEnabled } from "@/lib/features/pulse-poll-authoring";
import { buildToolLayoutMetadata } from "@/lib/seo/tool-layout-metadata";
import { notFound, redirect } from "next/navigation";
import { localeMfaRedirect } from "@/lib/auth/mfa-return-path";

const slug = "pulse-poll" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const meta = await buildToolLayoutMetadata(slug, params);
  return {
    ...meta,
    robots: { index: false, follow: false },
  };
}

export default async function PulsePollLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isPulsePollAuthoringEnabled()) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/app/login`);
  }
  if (!sessionMfaOk(session)) {
    redirect(localeMfaRedirect(locale, "/tools/pulse-poll"));
  }

  return children;
}
