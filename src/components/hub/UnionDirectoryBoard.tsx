"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type DirectoryLocal = {
  id: string;
  localNumber: string;
  divisionId: string | null;
  divisionName?: string | null;
};
type DirectoryState =
  | { kind: "loading" }
  | { kind: "unpaid" }
  | { kind: "unavailable" }
  | { kind: "ready"; locals: DirectoryLocal[] };

export function UnionDirectoryBoard() {
  const t = useTranslations("hub.unionAdmin");
  const [state, setState] = useState<DirectoryState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/union-directory", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 403) {
          const body = await response.json().catch(() => null) as { error?: string } | null;
          return body?.error === "Paid directory access required"
            ? { kind: "unpaid" } as const
            : { kind: "unavailable" } as const;
        }
        if (!response.ok) return { kind: "unavailable" } as const;
        const payload = await response.json() as { locals: DirectoryLocal[] };
        return { kind: "ready", locals: payload.locals } as const;
      })
      .then((next) => { if (!cancelled) setState(next); })
      .catch(() => { if (!cancelled) setState({ kind: "unavailable" }); });
    return () => { cancelled = true; };
  }, []);

  if (state.kind === "loading") return <p role="status" className="mt-6">{t("directoryLoading")}</p>;
  if (state.kind === "unpaid") return <p role="status" className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">{t("directoryUnpaid")}</p>;
  if (state.kind === "unavailable") return <p role="alert" className="mt-6 rounded-lg border border-gray-300 bg-gray-50 p-4">{t("directoryUnavailable")}</p>;
  if (state.locals.length === 0) return <p role="status" className="mt-6 rounded-lg border border-gray-300 bg-gray-50 p-4">{t("directoryEmpty")}</p>;

  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {state.locals.map((local) => (
        <li key={local.id} className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="font-semibold text-opseu-dark">{t("directoryLocal", { number: local.localNumber })}</p>
          {local.divisionName || local.divisionId ? (
            <p className="mt-1 text-sm text-gray-600">
              {t("directoryDivision", {
                id: local.divisionName || local.divisionId || "",
              })}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
