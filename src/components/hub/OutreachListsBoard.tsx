"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Callout } from "@/components/ui/Callout";

type ListRow = {
  id: string;
  name: string;
  status: string;
  confirmedCount: number;
  pendingCount: number;
};

export function OutreachListsBoard() {
  const t = useTranslations("hub.outreachLists");
  const [allowed, setAllowed] = useState(false);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [listId, setListId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [capRes, boardRes] = await Promise.all([
      fetch("/api/email/capabilities", { cache: "no-store" }),
      fetch("/api/outreach-lists", { cache: "no-store" }),
    ]);
    if (capRes.ok) {
      const cap = (await capRes.json()) as {
        allowed: { outreach_lists: boolean };
      };
      setAllowed(cap.allowed.outreach_lists);
    }
    if (!boardRes.ok) {
      setFeedback(t("error"));
      return;
    }
    const data = (await boardRes.json()) as { lists: ListRow[] };
    setLists(data.lists);
    if (data.lists[0]?.id) setListId(data.lists[0].id);
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch board on mount
    void load();
  }, [load]);

  async function send() {
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/outreach-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          listId,
          subject,
          body,
          release: true,
          mfaCode: mfaCode || undefined,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        stepUpRequired?: boolean;
      };
      if (!response.ok) {
        setFeedback(data.stepUpRequired ? t("mfaRequired") : data.error ?? t("error"));
        return;
      }
      setFeedback(t("sent"));
      setMfaCode("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) {
    return (
      <Callout tone="muted">
        <p className="font-medium">{t("disabledTitle")}</p>
        <p className="mt-1 text-sm">{t("disabledBody")}</p>
      </Callout>
    );
  }

  return (
    <div className="space-y-6">
      <Callout tone="warning">
        <p className="font-medium">{t("noticeTitle")}</p>
        <p className="mt-1 text-sm">{t("noticeBody")}</p>
      </Callout>
      <section className="rounded-lg border border-opseu-gray-light p-4">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("listsTitle")}</h2>
        {lists.length === 0 ? (
          <p className="mt-2 text-sm text-opseu-gray-dark">{t("noLists")}</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {lists.map((list) => (
              <li key={list.id}>
                <button
                  type="button"
                  className={`text-left ${listId === list.id ? "font-semibold" : ""}`}
                  onClick={() => setListId(list.id)}
                >
                  {list.name} — {t("counts", {
                    confirmed: list.confirmedCount,
                    pending: list.pendingCount,
                  })}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3 rounded-lg border border-opseu-gray-light p-4">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("composeTitle")}</h2>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} label={t("subject")} />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} label={t("body")} rows={8} />
        <Input
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value)}
          label={t("mfaCode")}
          autoComplete="one-time-code"
        />
        <Button type="button" disabled={busy || !listId} onClick={() => void send()}>
          {busy ? t("sending") : t("send")}
        </Button>
        {feedback ? <p className="text-sm text-opseu-gray-dark">{feedback}</p> : null}
      </section>
    </div>
  );
}
