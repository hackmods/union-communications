"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PortalPanel } from "@/components/portal/PortalPanel";
import { PortalPageLoading } from "@/components/portal/PortalPageLoading";
import { PortalRetryCallout } from "@/components/portal/PortalRetryCallout";
import type { ProposalPublication } from "@/types/hub-proposals";

/**
 * Member-facing proposals (Local Portal).
 * Only published, member-safe snapshots are read — never union counters,
 * caucus notes, or employer language.
 */
export function PortalProposals() {
  const t = useTranslations("portalProposals");
  const [publications, setPublications] = useState<ProposalPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/portal/proposals");
        if (cancelled) return;
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as {
          publications: ProposalPublication[];
        };
        if (cancelled) return;
        setPublications(data.publications);
        setError(null);
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, retry]);

  if (loading) return <PortalPageLoading />;

  return (
    <PortalPanel
      eyebrow={t("eyebrow")}
      title={t("title")}
      titleId="portal-proposals-heading"
      lead={t("subtitle")}
    >
      {error ? (
        <PortalRetryCallout
          message={t("loadError")}
          onRetry={() => {
            setLoading(true);
            setRetry((r) => r + 1);
          }}
        />
      ) : null}

      {!error && publications.length === 0 ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-600">{t("empty")}</p>
        </div>
      ) : null}

      {publications.length > 0 ? (
        <ul className="mt-4 space-y-4">
          {publications.map((pub) => (
            <li key={pub.id}>
              <article className="rounded-lg border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold tracking-wide text-opseu-blue uppercase">
                  {t("cardEyebrow")}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-opseu-dark">
                  {pub.headline}
                </h2>
                {pub.bullets.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {pub.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-3 text-xs text-gray-500">
                  {t("publishedLabel", {
                    date: new Date(pub.publishedAt).toLocaleString(),
                  })}
                </p>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </PortalPanel>
  );
}