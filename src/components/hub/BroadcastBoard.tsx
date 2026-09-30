"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Callout } from "@/components/ui/Callout";
import type {
  BroadcastCampaignRow,
  BroadcastRosterRow,
} from "@/lib/email/member-broadcast";

type Notice = { en: string; fr: string };

export function BroadcastBoard() {
  const t = useTranslations("hub.broadcast");
  const locale = useLocale() as "en" | "fr";
  const [mode, setMode] = useState<"officer" | "member" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [roster, setRoster] = useState<BroadcastRosterRow[]>([]);
  const [campaigns, setCampaigns] = useState<BroadcastCampaignRow[]>([]);
  const [self, setSelf] = useState<BroadcastRosterRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [trackingOptIn, setTrackingOptIn] = useState(false);
  const [trackingAllowed, setTrackingAllowed] = useState(false);
  const [broadcastAllowed, setBroadcastAllowed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendMfaCode, setSendMfaCode] = useState("");
  const [sendStepUpRequired, setSendStepUpRequired] = useState(false);
  const [sendChallengeError, setSendChallengeError] = useState("");

  const load = useCallback(async () => {
    const [capRes, boardRes] = await Promise.all([
      fetch("/api/email/capabilities", { cache: "no-store" }),
      fetch("/api/broadcast", { cache: "no-store" }),
    ]);
    if (capRes.ok) {
      const cap = (await capRes.json()) as {
        allowed: { member_broadcast: boolean; tracking_pixels: boolean };
      };
      setBroadcastAllowed(cap.allowed.member_broadcast);
      setTrackingAllowed(cap.allowed.tracking_pixels);
    }
    if (!boardRes.ok) {
      setFeedback(t("error"));
      return;
    }
    const data = (await boardRes.json()) as {
      mode: "officer" | "member";
      notice: Notice;
      roster?: BroadcastRosterRow[];
      campaigns?: BroadcastCampaignRow[];
      self?: BroadcastRosterRow;
    };
    setMode(data.mode);
    setNotice(data.notice);
    if (data.roster) {
      setRoster(data.roster);
      setSelected(
        data.roster.filter((r) => r.status === "confirmed").map((r) => r.userId),
      );
    }
    if (data.campaigns) setCampaigns(data.campaigns);
    if (data.self) setSelf(data.self);
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch roster on mount
    void load();
  }, [load]);

  async function saveConsent(consent: boolean) {
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "consent", consent, locale }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(t("error"));
      setFeedback(consent ? t("consentSaved") : t("consentRevoked"));
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function send(mfaCode?: string) {
    setBusy(true);
    setFeedback("");
    setSendChallengeError("");
    if (mfaCode === undefined) {
      setSendStepUpRequired(false);
      setSendMfaCode("");
    }
    try {
      const response = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          subject,
          body,
          recipientUserIds: selected,
          explicitTrackingOptIn: trackingOptIn,
          locale,
          ...(mfaCode ? { mfaCode } : {}),
        }),
        cache: "no-store",
      });
      const data = (await response.json()) as {
        error?: string;
        code?: string;
        accepted?: number;
        failed?: number;
        trackingApplied?: boolean;
      };
      if (response.status === 428) {
        setSendStepUpRequired(true);
        return;
      }
      if (!response.ok) {
        if (data.code === "mfa_step_up_failed") {
          setSendChallengeError(t("mfaStepUpFailed"));
        } else if (data.code === "mfa_step_up_limited") {
          setSendChallengeError(t("mfaStepUpLimited"));
        } else if (data.code === "mfa_step_up_unavailable") {
          setSendChallengeError(t("mfaStepUpUnavailable"));
        } else {
          throw new Error(data.error ?? t("error"));
        }
        return;
      }
      setSendStepUpRequired(false);
      setSendMfaCode("");
      setFeedback(
        t("sendResult", {
          accepted: data.accepted ?? 0,
          failed: data.failed ?? 0,
          tracking: data.trackingApplied ? t("yes") : t("no"),
        }),
      );
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {!broadcastAllowed ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {t("gatesClosed")}
        </p>
      ) : null}

      {notice ? (
        <p className="text-sm text-opseu-gray-dark">{notice[locale]}</p>
      ) : null}

      {mode === "member" && self ? (
        <section className="rounded-lg border border-opseu-gray-light bg-white p-4">
          <h2 className="text-lg font-semibold text-opseu-dark">
            {t("yourConsent")}
          </h2>
          <p className="mt-1 text-sm text-opseu-gray-dark">
            {t("status")}: {t(`status_${self.status}`)}
          </p>
          {self.status === "stale" ? (
            <p className="mt-2 text-sm text-amber-900">{t("staleConsent")}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || !broadcastAllowed}
              onClick={() => void saveConsent(true)}
            >
              {t("optIn")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !broadcastAllowed}
              onClick={() => void saveConsent(false)}
            >
              {t("optOut")}
            </Button>
          </div>
        </section>
      ) : null}

      {mode === "officer" ? (
        <>
          <section className="rounded-lg border border-opseu-gray-light bg-white p-4">
            <h2 className="text-lg font-semibold text-opseu-dark">
              {t("consentRoster")}
            </h2>
            <p className="mt-1 text-sm text-opseu-gray-dark">{t("rosterHint")}</p>
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
              {roster.map((row) => (
                <li key={row.userId} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={selected.includes(row.userId)}
                    disabled={row.status !== "confirmed"}
                    onChange={(e) => {
                      setSelected((prev) =>
                        e.target.checked
                          ? [...prev, row.userId]
                          : prev.filter((id) => id !== row.userId),
                      );
                    }}
                  />
                  <span>
                    <span className="font-medium text-opseu-dark">
                      {row.name}
                    </span>{" "}
                    <span className="text-opseu-gray-dark">
                      ({row.email}) — {t(`status_${row.status}`)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {campaigns.length > 0 ? (
            <section className="rounded-lg border border-opseu-gray-light bg-white p-4">
              <h2 className="text-lg font-semibold text-opseu-dark">
                {t("campaignHistory")}
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {campaigns.map((campaign) => (
                  <li
                    key={campaign.id}
                    className="flex flex-col gap-0.5 border-b border-opseu-gray-light pb-2 last:border-0"
                  >
                    <span className="font-medium text-opseu-dark">
                      {campaign.subject}
                    </span>
                    <span className="text-opseu-gray-dark">
                      {t("campaignMeta", {
                        date: new Date(campaign.createdAt).toLocaleString(
                          locale,
                        ),
                        accepted: campaign.acceptedCount,
                        failed: campaign.failedCount,
                        tracking: campaign.openTrackingApplied
                          ? t("yes")
                          : t("no"),
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-lg border border-opseu-gray-light bg-white p-4 space-y-3">
            <h2 className="text-lg font-semibold text-opseu-dark">
              {t("composeTitle")}
            </h2>
            <Input
              label={t("subject")}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Textarea
              label={t("body")}
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <label className="flex items-start gap-2 text-sm text-opseu-dark">
              <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={trackingOptIn}
                disabled={!trackingAllowed}
                onChange={(e) => setTrackingOptIn(e.target.checked)}
              />
              <span>
                {t("trackingOptIn")}
                {!trackingAllowed ? (
                  <span className="block text-xs text-opseu-gray-dark">
                    {t("trackingUnavailable")}
                  </span>
                ) : null}
              </span>
            </label>
            {sendStepUpRequired ? (
              <form
                className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(sendMfaCode.trim());
                }}
              >
                <h3 className="font-semibold text-amber-950">
                  {t("mfaStepUpTitle")}
                </h3>
                <p className="text-sm text-amber-900">{t("mfaStepUpHint")}</p>
                <Input
                  label={t("mfaCode")}
                  value={sendMfaCode}
                  onChange={(e) => setSendMfaCode(e.target.value)}
                  autoComplete="one-time-code"
                  maxLength={32}
                  autoFocus
                  required
                />
                {sendChallengeError ? (
                  <Callout role="alert" tone="danger">
                    {sendChallengeError}
                  </Callout>
                ) : null}
                <Button
                  type="submit"
                  disabled={busy || !sendMfaCode.trim()}
                >
                  {t("mfaStepUpVerify")}
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                disabled={
                  busy ||
                  !broadcastAllowed ||
                  !subject.trim() ||
                  !body.trim() ||
                  selected.length === 0
                }
                onClick={() => void send()}
              >
                {t("send")}
              </Button>
            )}
          </section>
        </>
      ) : null}

      {feedback ? (
        <p className="text-sm text-opseu-dark" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
