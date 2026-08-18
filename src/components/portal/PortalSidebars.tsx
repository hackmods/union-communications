"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { SidebarMessage, SidebarThread } from "@/types/portal";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { useSession } from "next-auth/react";
import { PortalRetryCallout } from "@/components/portal/PortalRetryCallout";

export function PortalSidebars() {
  const t = useTranslations("portal");
  const { data: session } = useSession();
  const [threads, setThreads] = useState<SidebarThread[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SidebarMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [toId, setToId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/sidebars");
      if (!res.ok) {
        setError(t("loadError"));
        return;
      }
      const data = (await res.json()) as { threads: SidebarThread[] };
      setThreads(data.threads);
      setError(null);
    } catch {
      setError(t("loadError"));
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/portal/sidebars")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(t("loadError"));
          return;
        }
        const data = (await res.json()) as { threads: SidebarThread[] };
        setThreads(data.threads);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    void fetch(`/api/portal/sidebars?threadId=${activeId}`)
      .then(async (res) => {
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { messages: SidebarMessage[] };
        setMessages(data.messages);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const shownMessages = activeId ? messages : [];

  const peers = DEMO_USERS.filter(
    (u) =>
      u.unionId === session?.user?.unionId && u.id !== session?.user?.id,
  );

  async function startThread(e: React.FormEvent) {
    e.preventDefault();
    const peer = peers.find((p) => p.id === toId);
    if (!peer) return;
    const res = await fetch("/api/portal/sidebars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toId: peer.id,
        toName: peer.name,
        message: draft.trim() || undefined,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { thread: SidebarThread };
      setDraft("");
      setToId("");
      await loadThreads();
      setActiveId(data.thread.id);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    const res = await fetch("/api/portal/sidebars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: activeId, message: draft.trim() }),
    });
    if (res.ok) {
      setDraft("");
      const msgRes = await fetch(`/api/portal/sidebars?threadId=${activeId}`);
      if (msgRes.ok) {
        const data = (await msgRes.json()) as { messages: SidebarMessage[] };
        setMessages(data.messages);
      }
      await loadThreads();
    }
  }

  if (error) {
    return (
      <PortalRetryCallout message={error} onRetry={() => void loadThreads()} />
    );
  }
  if (!threads) return <p className="text-gray-600">{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm">
          <Link href="/portal" className="text-opseu-blue hover:underline">
            {t("stationTitle")}
          </Link>
        </p>
        <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
          {t("sidebarsTitle")}
        </h1>
        <p className="mt-1 max-w-prose text-gray-600">{t("sidebarsSubtitle")}</p>
      </div>

      <Card density="compact">
      <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
        <div>
          <h2 className="text-sm font-medium text-gray-700">
            {t("sidebarsThreads")}
          </h2>
          {threads.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">{t("sidebarsEmpty")}</p>
          ) : (
          <ul className="mt-2 space-y-1">
            {threads.map((th) => {
              const other =
                th.participantNames.find(
                  (_, i) => th.participantIds[i] !== session?.user?.id,
                ) ?? th.participantNames[0];
              return (
                <li key={th.id}>
                  <button
                    type="button"
                    className={`min-h-11 w-full rounded-lg px-3 text-left text-sm font-medium ${
                      activeId === th.id
                        ? "bg-opseu-blue text-white"
                        : "hover:bg-opseu-blue/5"
                    }`}
                    onClick={() => setActiveId(th.id)}
                  >
                    {other}
                  </button>
                </li>
              );
            })}
          </ul>
          )}
          <form onSubmit={startThread} className="mt-4 space-y-2">
            <label className="block text-xs font-medium text-gray-600">
              {t("sidebarsNew")}
              <select
                className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-2"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
              >
                <option value="">{t("sidebarsPick")}</option>
                {peers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm" disabled={!toId}>
              {t("sidebarsStart")}
            </Button>
          </form>
        </div>

        <div>
          {activeId ? (
            <>
              <ul className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {shownMessages.map((m) => (
                  <li key={m.id} className="text-sm">
                    <span className="font-medium">{m.authorName}</span>
                    <span className="text-gray-500">
                      {" "}
                      · {new Date(m.createdAt).toLocaleString()}
                    </span>
                    <p>{m.body}</p>
                  </li>
                ))}
              </ul>
              <form onSubmit={send} className="mt-3 flex gap-2">
                <input
                  className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("sidebarsPlaceholder")}
                />
                <Button type="submit">{t("sendFloor")}</Button>
              </form>
            </>
          ) : (
            <p className="text-sm text-gray-500">{t("sidebarsPickThread")}</p>
          )}
        </div>
      </div>
      </Card>
    </div>
  );
}
