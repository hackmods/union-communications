"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useStewardReadOnly } from "@/hooks/use-steward-read-only";
import {
  canCreateTask,
  canMutateTaskAssignment,
} from "@/lib/tasks/access";
import type { Task } from "@/types/task";
import type { UserRole } from "@/types/tenant";

export function RelatedTasksPanel({
  relatedGrievanceId,
  relatedBumpingCaseId,
}: {
  relatedGrievanceId?: string;
  relatedBumpingCaseId?: string;
}) {
  const t = useTranslations("tasks");
  const { data: session } = useSession();
  const { readOnly } = useStewardReadOnly();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const userId = session?.user?.id ?? "";
  const canWrite = canCreateTask(roles) && !readOnly;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const queryKey = relatedGrievanceId
    ? `relatedGrievanceId=${encodeURIComponent(relatedGrievanceId)}`
    : relatedBumpingCaseId
      ? `relatedBumpingCaseId=${encodeURIComponent(relatedBumpingCaseId)}`
      : "";

  const reload = useCallback(async () => {
    if (!queryKey) return;
    const res = await fetch(`/api/tasks?${queryKey}`);
    if (!res.ok) {
      setError(t("relatedPanel.loadError"));
      return;
    }
    const data = (await res.json()) as { tasks: Task[] };
    setTasks(data.tasks);
    setError(null);
  }, [queryKey, t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!queryKey) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/tasks?${queryKey}`);
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { tasks: Task[] };
        if (!cancelled) {
          setTasks(data.tasks);
          setError(null);
        }
      } catch {
        if (!cancelled) setError(t("relatedPanel.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryKey, t]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          relatedGrievanceId,
          relatedBumpingCaseId,
        }),
      });
      if (!res.ok) {
        setError(t("relatedPanel.createError"));
        return;
      }
      setTitle("");
      setDueAt("");
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function markDone(task: Task) {
    if (
      readOnly ||
      !canMutateTaskAssignment(roles, task.assigneeId, userId)
    ) {
      return;
    }
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    if (res.ok) await reload();
    else setError(t("relatedPanel.updateError"));
  }

  if (!queryKey) return null;

  return (
    <Card className="mt-4">
      <CardTitle>{t("relatedPanel.title")}</CardTitle>
      <p className="mt-1 text-xs text-gray-500">{t("relatedPanel.hint")}</p>
      <p className="mt-1 text-xs">
        <Link href="/app/tasks" className="text-opseu-blue underline">
          {t("relatedPanel.openBoard")}
        </Link>
      </p>

      {loading ? (
        <p className="mt-2 text-sm text-gray-500">{t("loading")}</p>
      ) : error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : tasks.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">{t("relatedPanel.empty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
            >
              <div>
                <p
                  className={
                    task.status === "done"
                      ? "text-gray-500 line-through"
                      : "font-medium text-opseu-dark"
                  }
                >
                  {task.title}
                </p>
                {task.dueAt && (
                  <p className="text-xs text-gray-500">
                    {t("relatedPanel.due", {
                      date: new Date(task.dueAt).toLocaleDateString(),
                    })}
                  </p>
                )}
              </div>
              {task.status === "open" &&
                !readOnly &&
                canMutateTaskAssignment(roles, task.assigneeId, userId) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void markDone(task)}
                  >
                    {t("relatedPanel.markDone")}
                  </Button>
                )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form onSubmit={handleCreate} className="mt-4 space-y-2">
          <Input
            label={t("relatedPanel.titleField")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label={t("relatedPanel.dueField")}
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={saving || !title.trim()}>
            {saving ? t("relatedPanel.saving") : t("relatedPanel.add")}
          </Button>
        </form>
      )}
    </Card>
  );
}
