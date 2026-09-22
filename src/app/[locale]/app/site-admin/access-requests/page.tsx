import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AccessRequestsInbox } from "@/components/platform/AccessRequestsInbox";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
export default async function AccessRequestsPage({params}:{params:Promise<{locale:string}>}){const {locale}=await params;setRequestLocale(locale);const result=await requireSiteAdminSession();if(!result.ok)redirect(result.status===401?`/${locale}/app/login`:`/${locale}/app`);return <AccessRequestsInbox/>;}
