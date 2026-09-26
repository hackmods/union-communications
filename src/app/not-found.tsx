import { redirect } from "next/navigation";

/**
 * Root not-found — covers misses that never enter `[locale]` (and replaces
 * Next.js stock “404 This page could not be found.”).
 *
 * Redirect into the EN locale shell so stewards get Header/Footer + i18n
 * Local 404 (Create / Utilities / Learn). Invalid-locale layout misses also
 * land here, then bounce into a known locale recovery path.
 */
export default function RootNotFound() {
  redirect("/en/this-page-should-404");
}
