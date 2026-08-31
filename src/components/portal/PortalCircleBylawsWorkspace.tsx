"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BylawBuilderWorkspace } from "@/components/tools/bylaws/BylawBuilderWorkspace";
import { PortalRetryCallout } from "@/components/portal/PortalRetryCallout";
import { Callout } from "@/components/ui/Callout";
import { canWriteCircle } from "@/lib/portal/access";
import type { CircleDetailPayload } from "@/types/portal";

export function PortalCircleBylawsWorkspace({
  circleId,
}: {
  circleId: string;
}) {
  const t = useTranslations("portal");
  const [detail, setDetail] = useState<CircleDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    void fetch(`/api/portal/circles/${circleId}`)
      .then(async (res) => {
        if (!res.ok) {
          setError(t("loadError"));
          return;
        }
        const data = (await res.json()) as { detail: CircleDetailPayload };
        setDetail(data.detail);
        setError(null);
      })
      .catch(() => setError(t("loadError")));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  if (error) {
    return (
      <PortalRetryCallout message={error} onRetry={load} />
    );
  }

  if (!detail) {
    return <p className="text-gray-600">{t("loading")}</p>;
  }

  const canWrite = canWriteCircle(detail.membership.role);

  return (
    <div className="space-y-6">
      <header className="max-w-3xl space-y-2">
        <p className="text-sm font-semibold text-opseu-blue">
          <Link
            href={`/portal/circles/${circleId}?tab=bulletin`}
            className="underline underline-offset-2"
          >
            {t("bylawsBackToCircle", { circleName: detail.circle.name })}
          </Link>
        </p>
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("bylawsPageTitle")}
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-gray-700">
          {t("bylawsPageIntro")}
        </p>
      </header>

      {!canWrite ? (
        <Callout tone="warning" className="max-w-2xl">
          <p className="font-semibold text-amber-950">{t("bylawsReadOnlyTitle")}</p>
          <p className="mt-1 text-sm text-gray-700">{t("bylawsReadOnlyBody")}</p>
        </Callout>
      ) : null}

      <BylawBuilderWorkspace
        portalContext={{
          circleId,
          circleName: detail.circle.name,
          readOnly: !canWrite,
        }}
      />
    </div>
  );
}
