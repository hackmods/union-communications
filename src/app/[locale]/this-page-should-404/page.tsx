import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

/**
 * Real page so root `not-found` can redirect into the locale shell without
 * looping. Calling `notFound()` renders `[locale]/not-found.tsx` (Header,
 * Footer, Create / Utilities / Learn recovery).
 */
export default async function LocaleNotFoundLanding({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  notFound();
}
