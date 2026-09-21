import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireDataAccess } from "@/lib/data-workbench/access";
import { DataWorkbench } from "@/components/hub/data/DataWorkbench";

export default async function DataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireDataAccess();
  if (!access.ok) {
    if (access.status === 401) redirect(`/${locale}/app/login`);
    if (access.status === 403 && access.error === "MFA required") redirect(`/${locale}/app/mfa`);
    if (access.status === 403 || access.status === 404) redirect(`/${locale}/app`);
    return <main className="mx-auto max-w-4xl p-6"><h1 className="text-2xl font-semibold">UnionOps Data</h1><p className="mt-3 text-gray-700">{access.error}</p></main>;
  }
  return <DataWorkbench />;
}
