import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirectUnlessSiteAdmin, requireSiteAdminSession } from "@/lib/auth/site-admin-session";

export const dynamic = "force-dynamic";

/** Legacy Locals union detail → Organization structure union detail. */
export default async function SiteAdminLocalsUnionRedirect({
  params,
}: {
  params: Promise<{ locale: string; union: string }>;
}) {
  const { locale, union } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  redirectUnlessSiteAdmin(locale, gate, "/app/site-admin/locals/x");
  redirect(
    `/${locale}/app/site-admin/organization/${encodeURIComponent(union)}`,
  );
}
