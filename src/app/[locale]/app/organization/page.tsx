import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability } from "@/lib/authorization/model";
import { OrganizationManager } from "@/components/hub/OrganizationManager";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

export default async function OrganizationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(`/${locale}/app/mfa`);
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) redirect(`/${locale}/app/login`);
  const localId = session.user.localId;
  if (!session.user.unionId || !localId) redirect(`/${locale}/app`);
  const canManage = ["memberships.manage", "officers.manage", "delegations.manage"].some((capability) =>
    decideCapability(actor, capability as "memberships.manage" | "officers.manage" | "delegations.manage", { unionId: session.user.unionId, localId }).allowed,
  );
  if (!canManage) redirect(`/${locale}/app`);
  return <OrganizationManager localId={localId} />;
}
