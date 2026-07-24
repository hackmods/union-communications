"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { useSessionMfaOk } from "@/components/hub/MfaPolicyProvider";
import { getTenantContext } from "@/lib/tenant/loader";
import { canAccessTasksModule } from "@/lib/tasks/access";
import type { Task } from "@/types/task";
import type { HubModule, UserRole } from "@/types/tenant";

/** Compact "My tasks" strip for the Hub dashboard when the tasks module is on. */
export function MyTasksWidget() {
  const t = useTranslations("tasks");
  const { data: session } = useSession();
  const mfaOk = useSessionMfaOk();
  const [tasks, setTasks] = useState<Task[]>([]);
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
    canAccessTasksModule(roles) &&
    enabledModules.includes("tasks");

  useEffect(() => {
    if (!show) return;
    void fetch("/api/tasks?mine=1&status=open")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { tasks: Task[] };
        setTasks(data.tasks.slice(0, 5));
      })
      .finally(() => {
        setLoading(false);
        setFetched(true);
      });
  }, [show]);

  if (!show) return null;

  const busy = loading && !fetched;

  return (
    <Card className="mt-8">
      <CardTitle>{t("widgetTitle")}</CardTitle>
      <p className="mt-2 text-sm text-gray-600">{t("widgetDesc")}</p>
      {busy ? (
        <p className="mt-3 text-sm text-gray-500">{t("loading")}</p>
      ) : tasks.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{t("widgetEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {tasks.map((task) => (
            <li key={task.id} className="text-gray-800">
              {task.title}
              {task.dueAt ? (
                <span className="ml-2 text-gray-500">
                  {new Date(task.dueAt).toLocaleDateString()}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/app/tasks"
        className="mt-4 inline-block text-sm text-opseu-blue underline"
      >
        {t("widgetLink")}
      </Link>
    </Card>
  );
}
