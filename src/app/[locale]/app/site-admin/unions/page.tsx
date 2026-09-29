import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";

export const dynamic = "force-dynamic";

/** Legacy Unions index → Organization structure. */
export default async function SiteAdminUnionsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    if (gate.status === 403) redirect(`/${locale}/app`);
    redirect(`/${locale}/app/login`);
  }
  redirect(`/${locale}/app/site-admin/organization`);
}
