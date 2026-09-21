"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type MemberCase = {
  id: string;
  category: string;
  filedAt: string;
  status: string;
  currentStep: number;
  dueAt: string | null;
  updates: Array<{ id: string; body: string; publishedAt: string }>;
  attachments: Array<{ id: string }>;
};

export function PortalMyCases() {
  const t = useTranslations("portal.myCases");
  const [cases, setCases] = useState<MemberCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portal/my-cases", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Request failed");
        return response.json() as Promise<{ cases: MemberCase[] }>;
      })
      .then((payload) => {
        if (!cancelled) setCases(payload.cases);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p role="status" className="text-sm text-gray-600">{t("loading")}</p>;
  if (failed) return <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">{t("error")}</p>;

  return (
    <section aria-labelledby="my-cases-heading" className="space-y-4">
      <div>
        <h1 id="my-cases-heading" className="text-2xl font-bold text-opseu-dark">{t("title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-700">{t("intro")}</p>
      </div>
      {cases.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-700">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {cases.map((item) => (
            <li key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-opseu-dark">{item.category}</h2>
                  <p className="mt-1 text-sm text-gray-700">
                    {t("filed", { date: new Date(item.filedAt).toLocaleDateString() })}
                    {" · "}{t("step", { step: item.currentStep })}
                  </p>
                </div>
                <span className="rounded-full bg-opseu-blue/10 px-3 py-1 text-sm font-medium text-opseu-dark">{t(`status.${item.status}` as "status.open")}</span>
              </div>
              {item.dueAt ? <p className="mt-2 text-sm text-gray-700">{t("due", { date: new Date(item.dueAt).toLocaleDateString() })}</p> : null}
              {item.updates.length ? (
                <section className="mt-4 border-t border-gray-100 pt-3" aria-label={t("updatesHeading")}>
                  <h3 className="text-sm font-semibold">{t("updatesHeading")}</h3>
                  <ul className="mt-2 space-y-2">
                    {item.updates.map((update) => (
                      <li key={update.id} className="rounded-md bg-gray-50 p-3 text-sm">
                        <p>{update.body}</p>
                        <time className="mt-1 block text-xs text-gray-600" dateTime={update.publishedAt}>{new Date(update.publishedAt).toLocaleDateString()}</time>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">{t("noUpdates")}</p>}
              {item.attachments.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.attachments.map((attachment, index) => (
                    <a key={attachment.id} className="inline-flex min-h-10 items-center rounded-md border border-opseu-blue px-3 text-sm font-medium text-opseu-blue hover:bg-opseu-blue/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" href={`/api/portal/my-cases/${encodeURIComponent(item.id)}/attachments/${encodeURIComponent(attachment.id)}`}>
                      {t("attachment", { number: index + 1 })}
                    </a>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
