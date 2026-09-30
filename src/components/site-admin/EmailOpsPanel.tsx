"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type PresetRow = { id: string; classification: string };
type HostFlags = {
  member_broadcast: boolean;
  outreach_lists: boolean;
  comms_auto_send: boolean;
  grievance_smtp: boolean;
  tracking_pixels: boolean;
};
type Health = {
  emailEnabled: boolean;
  emailFlag: boolean;
  smtp: {
    preferredTransport: string;
    from: string | null;
    mailgunApiConfigured: boolean;
    host: string | null;
  };
  productNews: { enabled: boolean; reason: string | null };
  enterpriseHost?: HostFlags;
};
type Artifact = { subject: string; text: string; html: string };
type UnionEntitlement = {
  id: string;
  name: string;
  slug: string;
  memberBroadcastEnabled: boolean;
  outreachListsEnabled: boolean;
  commsAutoSendEnabled: boolean;
  grievanceSmtpEnabled: boolean;
  emailTrackingPixelsEnabled: boolean;
};

const PRESET_LABEL_KEYS: Record<string, string> = {
  invite_accept: "presetInvite",
  sign_in_link: "presetSignIn",
  password_reset: "presetPasswordReset",
  officer_meeting_reminder: "presetOfficerReminder",
  rsvp_confirmation: "presetRsvp",
};

export function EmailOpsPanel() {
  const t = useTranslations("emailOpsAdmin");
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [unions, setUnions] = useState<UnionEntitlement[]>([]);
  const [durable, setDurable] = useState(false);
  const [presetId, setPresetId] = useState("invite_accept");
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const [view, setView] = useState<"html" | "text">("html");
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [testTo, setTestTo] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [entitlementBusyId, setEntitlementBusyId] = useState<string | null>(
    null,
  );

  const load = useCallback(async () => {
    const [opsRes, entRes] = await Promise.all([
      fetch("/api/site-admin/email-ops", { cache: "no-store" }),
      fetch("/api/site-admin/email-entitlements", { cache: "no-store" }),
    ]);
    if (!opsRes.ok) throw new Error("load");
    const ops = (await opsRes.json()) as {
      presets: PresetRow[];
      health: Health;
    };
    setPresets(ops.presets);
    setHealth(ops.health);
    if (ops.presets[0]?.id) setPresetId(ops.presets[0].id);

    if (entRes.ok) {
      const ent = (await entRes.json()) as {
        durable: boolean;
        unions: UnionEntitlement[];
        host: HostFlags;
      };
      setDurable(ent.durable);
      setUnions(ent.unions);
      setHealth((prev) =>
        prev
          ? { ...prev, enterpriseHost: ent.host }
          : { ...ops.health, enterpriseHost: ent.host },
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load ops snapshot on mount
    void load().catch(() => {
      if (!cancelled) setFeedback(t("error"));
    });
    return () => {
      cancelled = true;
    };
  }, [load, t]);

  async function preview() {
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/site-admin/email-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", presetId, locale }),
        cache: "no-store",
      });
      const data = (await response.json()) as {
        artifact?: Artifact;
        error?: string;
      };
      if (!response.ok || !data.artifact) {
        throw new Error(data.error ?? t("error"));
      }
      setArtifact(data.artifact);
      setFeedback(t("previewReady"));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function testSend() {
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/site-admin/email-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_send",
          presetId,
          locale,
          to: testTo,
        }),
        cache: "no-store",
      });
      const data = (await response.json()) as { error?: string; ok?: boolean };
      if (!response.ok) throw new Error(data.error ?? t("error"));
      setFeedback(t("testSent"));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function patchEntitlement(
    unionId: string,
    patch: Partial<
      Pick<
        UnionEntitlement,
        | "memberBroadcastEnabled"
        | "commsAutoSendEnabled"
        | "grievanceSmtpEnabled"
        | "emailTrackingPixelsEnabled"
      >
    >,
  ) {
    setEntitlementBusyId(unionId);
    setFeedback("");
    try {
      const response = await fetch("/api/site-admin/email-entitlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unionId, ...patch }),
        cache: "no-store",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("error"));
      setUnions((rows) =>
        rows.map((row) => (row.id === unionId ? { ...row, ...patch } : row)),
      );
      setFeedback(t("entitlementSaved"));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : t("error"));
    } finally {
      setEntitlementBusyId(null);
    }
  }

  const host = health?.enterpriseHost;

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-lg border border-opseu-gray-light bg-white p-4">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("healthTitle")}</h2>
        {health ? (
          <ul className="mt-3 space-y-1 text-sm text-opseu-gray-dark">
            <li>
              {t("healthFlag")}: {health.emailFlag ? t("yes") : t("no")}
            </li>
            <li>
              {t("healthReady")}: {health.emailEnabled ? t("yes") : t("no")}
            </li>
            <li>
              {t("healthTransport")}: {health.smtp.preferredTransport}
            </li>
            <li>
              {t("healthFrom")}: {health.smtp.from ?? t("none")}
            </li>
            <li>
              {t("healthProductNews")}:{" "}
              {health.productNews.enabled
                ? t("yes")
                : (health.productNews.reason ?? t("no"))}
            </li>
          </ul>
        ) : (
          <p className="mt-2 text-sm text-opseu-gray-dark">{t("loading")}</p>
        )}
      </section>

      <section className="rounded-lg border border-opseu-gray-light bg-white p-4">
        <h2 className="text-lg font-semibold text-opseu-dark">
          {t("enterpriseTitle")}
        </h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("enterpriseHint")}</p>
        {host ? (
          <ul className="mt-3 space-y-1 text-sm text-opseu-gray-dark">
            <li>
              {t("hostBroadcast")}: {host.member_broadcast ? t("yes") : t("no")}
            </li>
            <li>
              {t("hostOutreachLists")}:{" "}
              {host.outreach_lists ? t("yes") : t("no")}
            </li>
            <li>
              {t("hostCommsAutoSend")}:{" "}
              {host.comms_auto_send ? t("yes") : t("no")}
            </li>
            <li>
              {t("hostGrievanceSmtp")}:{" "}
              {host.grievance_smtp ? t("yes") : t("no")}
            </li>
            <li>
              {t("hostTracking")}: {host.tracking_pixels ? t("yes") : t("no")}
            </li>
          </ul>
        ) : null}
        {!durable ? (
          <p className="mt-3 text-sm text-amber-800">{t("entitlementNeedsPostgres")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {unions.length === 0 ? (
              <p className="text-sm text-opseu-gray-dark">{t("noUnions")}</p>
            ) : (
              unions.map((row) => (
                <div
                  key={row.id}
                  className="rounded-md border border-opseu-gray-light bg-opseu-gray-light/20 p-3"
                >
                  <p className="text-sm font-medium text-opseu-dark">
                    {row.name}{" "}
                    <span className="font-normal text-opseu-gray-dark">
                      ({row.slug})
                    </span>
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        [
                          "memberBroadcastEnabled",
                          t("entitlementBroadcast"),
                          host?.member_broadcast === true,
                        ],
                        [
                          "outreachListsEnabled",
                          t("entitlementOutreachLists"),
                          host?.outreach_lists === true,
                        ],
                        [
                          "commsAutoSendEnabled",
                          t("entitlementComms"),
                          host?.comms_auto_send === true,
                        ],
                        [
                          "grievanceSmtpEnabled",
                          t("entitlementGrievance"),
                          host?.grievance_smtp === true,
                        ],
                        [
                          "emailTrackingPixelsEnabled",
                          t("entitlementTracking"),
                          host?.tracking_pixels === true,
                        ],
                      ] as const
                    ).map(([key, label, hostOn]) => (
                      <label
                        key={key}
                        className="flex items-start gap-2 text-sm text-opseu-dark"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4"
                          checked={row[key]}
                          disabled={
                            entitlementBusyId === row.id || !hostOn
                          }
                          onChange={(e) =>
                            void patchEntitlement(row.id, {
                              [key]: e.target.checked,
                            })
                          }
                        />
                        <span>
                          {label}
                          {!hostOn ? (
                            <span className="block text-xs text-opseu-gray-dark">
                              {t("hostOffHint")}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-opseu-gray-light bg-white p-4">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("studioTitle")}</h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("studioHint")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-opseu-dark">
            {t("preset")}
            <select
              className="mt-1 w-full rounded-md border border-opseu-gray-light px-3 py-2 text-sm"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {t(PRESET_LABEL_KEYS[p.id] ?? "presetInvite")} ({p.classification})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-opseu-dark">
            {t("locale")}
            <select
              className="mt-1 w-full rounded-md border border-opseu-gray-light px-3 py-2 text-sm"
              value={locale}
              onChange={(e) => setLocale(e.target.value as "en" | "fr")}
            >
              <option value="en">EN</option>
              <option value="fr">FR</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void preview()} disabled={busy}>
            {t("preview")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setView("html")}
            disabled={!artifact}
          >
            {t("viewHtml")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setView("text")}
            disabled={!artifact}
          >
            {t("viewText")}
          </Button>
        </div>
        {artifact ? (
          <div className="mt-4">
            <p className="text-sm font-medium text-opseu-dark">
              {t("subject")}: {artifact.subject}
            </p>
            {view === "html" ? (
              <iframe
                title={t("previewFrame")}
                className="mt-2 h-[420px] w-full rounded-md border border-opseu-gray-light bg-white"
                srcDoc={artifact.html}
                sandbox=""
              />
            ) : (
              <pre className="mt-2 max-h-[420px] overflow-auto rounded-md border border-opseu-gray-light bg-opseu-gray-light/30 p-3 text-xs whitespace-pre-wrap">
                {artifact.text}
              </pre>
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-opseu-gray-light bg-white p-4">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("testTitle")}</h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("testHint")}</p>
        <label className="mt-3 block text-sm font-medium text-opseu-dark" htmlFor="email-ops-test-to">
          {t("testTo")}
        </label>
        <Input
          id="email-ops-test-to"
          type="email"
          className="mt-1"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          autoComplete="email"
        />
        <Button
          type="button"
          className="mt-3"
          onClick={() => void testSend()}
          disabled={busy || !testTo.trim()}
        >
          {t("testSend")}
        </Button>
      </section>

      {feedback ? (
        <p className="text-sm text-opseu-dark" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
