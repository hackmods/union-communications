"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { getTenantContext } from "@/lib/tenant/loader";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import type { TenantContext, UserRole } from "@/types/tenant";

/**
 * Hub local + collection (bargaining unit) switcher.
 * Updates JWT via session.update so list APIs filter by active context.
 * Merges GET /api/tenant so runtime overlay locals/collections appear.
 */
export function HubContextSwitcher() {
  const { data: session, update, status } = useSession();
  const t = useTranslations("hub");
  const unionId = session?.user?.unionId;
  const seedTenant = unionId ? getTenantContext(unionId) : null;
  const [tenant, setTenant] = useState<TenantContext | null>(seedTenant);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.mfaVerified || !unionId) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/tenant");
        if (!res.ok) return;
        const data = (await res.json()) as { context: TenantContext };
        if (!cancelled) setTenant(data.context);
      } catch {
        if (!cancelled && unionId) setTenant(getTenantContext(unionId));
      }
    }

    const onUpdate = () => {
      void load();
    };

    void load();
    window.addEventListener("unionops:tenant-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("unionops:tenant-updated", onUpdate);
    };
  }, [status, session?.user?.mfaVerified, unionId]);

  if (status !== "authenticated" || !session?.user?.unionId || !tenant) {
    return null;
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  const accessible =
    session.user.accessibleLocalIds?.length
      ? tenant.locals.filter((l) =>
          session.user.accessibleLocalIds!.includes(l.id),
        )
      : tenant.locals.filter((l) => l.id === session.user.localId);

  const crossLocal = canCrossLocalGrievance(roles);
  const localOptions = crossLocal ? tenant.locals : accessible;
  const canSwitchLocal = localOptions.length > 1 || crossLocal;

  const activeLocalId = session.user.localId;
  const collections = activeLocalId
    ? tenant.bargainingUnits.filter((b) => b.localId === activeLocalId)
    : [];

  const onLocalChange = async (value: string) => {
    const localId = value === "__all__" ? undefined : value || undefined;
    const units = localId
      ? tenant.bargainingUnits.filter((b) => b.localId === localId)
      : [];
    await update({
      localId,
      bargainingUnitId: units[0]?.id,
    });
  };

  const onCollectionChange = async (value: string) => {
    await update({
      localId: session.user.localId,
      bargainingUnitId: value || undefined,
    });
  };

  if (!canSwitchLocal && collections.length <= 1) {
    return (
      <span className="shrink-0 whitespace-nowrap text-gray-600">
        {tenant.union.name}
        {tenant.division && ` · ${tenant.division.name}`}
        {tenant.local && ` · Local ${tenant.local.localNumber}`}
        {collections[0] && ` · ${collections[0].code.toUpperCase()}`}
      </span>
    );
  }

  return (
    <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5 text-gray-600">
      <span className="whitespace-nowrap">{tenant.union.name}</span>
      {tenant.division && (
        <span className="whitespace-nowrap">· {tenant.division.name}</span>
      )}
      {canSwitchLocal ? (
        <label className="inline-flex items-center gap-1">
          <span className="sr-only">{t("contextLocal")}</span>
          <select
            className="max-w-[9rem] rounded border border-gray-300 bg-white px-1.5 py-0.5 text-sm"
            value={activeLocalId ?? (crossLocal ? "__all__" : "")}
            onChange={(e) => void onLocalChange(e.target.value)}
            aria-label={t("contextLocal")}
          >
            {crossLocal && (
              <option value="__all__">{t("contextAllLocals")}</option>
            )}
            {localOptions.map((local) => (
              <option key={local.id} value={local.id}>
                Local {local.localNumber}
              </option>
            ))}
          </select>
        </label>
      ) : (
        activeLocalId && (
          <span className="whitespace-nowrap">
            · Local{" "}
            {tenant.locals.find((l) => l.id === activeLocalId)?.localNumber}
          </span>
        )
      )}
      {collections.length > 0 && (
        <label className="inline-flex items-center gap-1">
          <span className="sr-only">{t("contextCollection")}</span>
          <select
            className="max-w-[11rem] rounded border border-gray-300 bg-white px-1.5 py-0.5 text-sm"
            value={session.user.bargainingUnitId ?? ""}
            onChange={(e) => void onCollectionChange(e.target.value)}
            aria-label={t("contextCollection")}
          >
            <option value="">{t("contextAllCollections")}</option>
            {collections.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.code.toUpperCase()} — {unit.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
