"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { useSessionMfaOk } from "@/components/hub/MfaPolicyProvider";
import { getTenantContext } from "@/lib/tenant/loader";
import { canAccessCheckinsModule } from "@/lib/checkins/access";
import type { CheckinPendingItem } from "@/types/checkins";
import type { HubModule, UserRole } from "@/types/tenant";

/** Compact unanswered check-ins strip for the Hub dashboard. */
export function MyCheckinsWidget() {
  const t = useTranslations("checkins");
  const { data: session } = useSession();
  const mfaOk = useSessionMfaOk();
  const [pending, setPending] = useState<CheckinPendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(false);

  const roles = (session?.user?.roles ?? []) as UserRole[];
  const tenant = session?.user?.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  const enabledModules: HubModule[] =
    tenant?.union.enabledModules ?? ["comms"];
  const show =
    mfaOk &&
    canAccessCheckinsModule(roles) &&
    enabledModules.includes("checkins");

  useEffect(() => {
    if (!show) return;
    void fetch("/api/checkins/mine?unanswered=1")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { pending: CheckinPendingItem[] };
        setPending((data.pending ?? []).slice(0, 5));
      })
      .finally(() => {
        setLoading(false);
        setFetched(true);
      });
  }, [show]);

  if (!show) return null;

  const busy = loading && !fetched;
  if (!busy && pending.length === 0) return null;

  return (
    <Card density="compact" className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-base">{t("widgetTitle")}</CardTitle>
        <Link
          href="/app/checkins"
          className="text-sm text-opseu-blue underline"
        >
          {t("widgetAll")}
        </Link>
      </div>
      {busy ? (
        <p className="mt-2 text-sm text-gray-600">{t("loading")}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {pending.map((item) => (
            <li key={item.schedule.id}>
              <Link
                href={`/app/checkins/${item.schedule.id}`}
                className="block text-sm text-opseu-dark hover:underline"
              >
                {item.schedule.question}
              </Link>
              <p className="text-xs text-gray-500">
                {t("periodLabel", { period: item.periodLabel })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
