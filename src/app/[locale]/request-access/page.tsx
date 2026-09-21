import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { AccessRequestForm } from "@/components/access/AccessRequestForm";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{return buildPublicPageMetadata("/request-access",params);}
export default async function RequestAccessPage({params}:{params:Promise<{locale:string}>}){const {locale}=await params;setRequestLocale(locale);const fr=locale==="fr";return <ComposedPageLayout composition="hub" size="read" className="py-10 md:py-14"><Link href="/join" className="text-sm font-semibold text-opseu-blue underline">{fr?"← Retour à l’accès bêta":"← Back to beta access"}</Link><h1 className="mt-5 text-4xl font-bold text-opseu-dark">{fr?"Demander l’accès membre":"Request member access"}</h1><p className="mt-4 max-w-prose text-lg leading-relaxed text-slate-700">{fr?"Indiquez votre syndicat et votre local. Nous acheminerons la demande à la bonne personne après vérification. Cette demande ne crée pas de compte et n’inscrit personne à un syndicat.":"Tell us your union and local. We’ll route the request after verification. This does not create an account or enroll anyone in a union."}</p><PublicHubPanel className="mt-8 p-5 sm:p-7"><AccessRequestForm kind="member_access" locale={locale}/></PublicHubPanel></ComposedPageLayout>}

