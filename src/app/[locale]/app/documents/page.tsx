import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DocumentsVault } from "@/components/hub/DocumentsVault";
import { ModuleDisabledPanel } from "@/components/hub/ModuleDisabledPanel";
import { isSessionModuleEnabled } from "@/lib/hub/session-modules";
import type { UserRole } from "@/types/tenant";
import { requireDocumentsSession } from "@/lib/auth/documents-session";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/app/login`);
  }
  if (!sessionMfaOk(session)) {
    redirect(`/${locale}/app/mfa`);
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!isSessionModuleEnabled(session, "documents")) {
    return <ModuleDisabledPanel moduleId="documents" roles={roles} />;
  }
  const access = await requireDocumentsSession();
  if (!access.ok) redirect(`/${locale}/app`);

  return <DocumentsVault />;
}
