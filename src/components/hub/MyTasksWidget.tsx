"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import type { Task } from "@/types/task";

type LoadState = "loading" | "ready" | "error";

/** Personal work only; the API applies the active union, local and assignee scope. */
export function MyTasksWidget() {
  const t = useTranslations("tasks");
  const locale = useLocale();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/tasks?mine=1&status=open", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Tasks: ${res.status}`);
        const data = (await res.json()) as { tasks?: Task[] };
        setTasks((data.tasks ?? []).slice(0, 5));
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, []);

  return (
    <Card density="compact" className="h-full min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CardTitle>{t("widgetTitle")}</CardTitle>
        <Link href="/app/tasks" className="text-sm font-medium text-opseu-blue underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2">
          {t("widgetLink")}
        </Link>
      </div>
      <div role="status" aria-live="polite" className="mt-3 text-sm leading-relaxed text-gray-700">
        {state === "loading" ? <p>{t("loading")}</p> : null}
        {state === "error" ? <p>{t("widgetError")}</p> : null}
        {state === "ready" && tasks.length === 0 ? <p>{t("widgetEmpty")}</p> : null}
        {state === "ready" && tasks.length > 0 ? (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="border-t border-slate-200 pt-2 first:border-0 first:pt-0">
                <span className="font-medium text-opseu-dark">{task.title}</span>
                {task.dueAt ? <span className="ml-2 text-gray-600">{new Date(task.dueAt).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA")}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}
