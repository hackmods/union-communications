import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { PublicDocumentsAdmin } from "@/components/site-admin/PublicDocumentsAdmin";
import {
  requirePublicDocumentAdmin,
  type PublicDocumentAdminReadinessCode,
} from "@/lib/auth/public-document-admin";

export const dynamic = "force-dynamic";

const READINESS_REASON_KEYS: Record<
  PublicDocumentAdminReadinessCode,
  "publicDocumentsReasonMfa" | "publicDocumentsReasonPostgres" | "publicDocumentsReasonStorage"
> = {
  mfa_disabled: "publicDocumentsReasonMfa",
  postgres_required: "publicDocumentsReasonPostgres",
  storage_required: "publicDocumentsReasonStorage",
};

export default async function PublicDocumentsAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const gate = await requirePublicDocumentAdmin();

  if (!gate.ok && gate.status === 401) {
    redirect(`/${locale}/app/login`);
  }
  if (!gate.ok && gate.status === 403) {
    redirect(`/${locale}/app/site-admin`);
  }

  const t = await getTranslations({
    locale,
    namespace: "hub.platformOperator",
  });

  if (!gate.ok) {
    const reasonKey = gate.code
      ? READINESS_REASON_KEYS[gate.code]
      : null;
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm">
          <Link
            href="/app/site-admin"
            className="font-medium text-opseu-blue underline underline-offset-2"
          >
            ← {t("siteAdmin")}
          </Link>
        </p>
        <h1 className="mt-4 text-2xl font-bold text-opseu-dark">
          {t("publicDocumentsNotReadyTitle")}
        </h1>
        <Callout tone="warning" role="status" measure="fill" className="mt-4">
          <p>{t("publicDocumentsNotReadyBody")}</p>
          {reasonKey ? (
            <p className="mt-2 font-medium">{t(reasonKey)}</p>
          ) : (
            <p className="mt-2 font-medium">{gate.error}</p>
          )}
        </Callout>
        <p className="mt-4 text-sm text-opseu-gray-dark">
          {t("publicDocumentsNotReadyNext")}
        </p>
      </main>
    );
  }

  return <PublicDocumentsAdmin />;
}
