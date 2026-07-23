"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  canAssignOthers,
  canCreateTask,
  canDeleteTask,
  canMutateTaskAssignment,
  isElevatedTaskRole,
} from "@/lib/tasks/access";
import type { Task, TaskStatus } from "@/types/task";
import type { UserRole } from "@/types/tenant";

type FilterMode = "open" | "done" | "all" | "mine";

export function TaskBoard() {
  const t = useTranslations("tasks");
  const th = useTranslations("hub");
  const { data: session } = useSession();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const userId = session?.user?.id ?? "";
  const canWrite = canCreateTask(roles);
  const elevated = isElevatedTaskRole(roles);
  const canPickAssignee = canAssignOthers(roles);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("open");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [relatedGrievanceId, setRelatedGrievanceId] = useState("");
  const [relatedBumpingCaseId, setRelatedBumpingCaseId] = useState("");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter === "mine") params.set("mine", "1");
    if (filter === "open" || filter === "done") params.set("status", filter);
    void fetch(`/api/tasks?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { tasks: Task[] };
        setTasks(data.tasks);
        setError(null);
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [filter, t]);

  const openCount = useMemo(
    () => tasks.filter((task) => task.status === "open").length,
    [tasks],
  );

  async function refresh() {
    const params = new URLSearchParams();
    if (filter === "mine") params.set("mine", "1");
    if (filter === "open" || filter === "done") params.set("status", filter);
    const res = await fetch(`/api/tasks?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { tasks: Task[] };
      setTasks(data.tasks);
    } else {
      setError(t("loadError"));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    const body: Record<string, string> = { title };
    if (dueAt) body.dueAt = new Date(dueAt).toISOString();
    if (canPickAssignee && assigneeId.trim()) {
      body.assigneeId = assigneeId.trim();
    }
    if (relatedGrievanceId.trim()) {
      body.relatedGrievanceId = relatedGrievanceId.trim();
    }
    if (relatedBumpingCaseId.trim()) {
      body.relatedBumpingCaseId = relatedBumpingCaseId.trim();
    }
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setTitle("");
      setDueAt("");
      setAssigneeId("");
      setRelatedGrievanceId("");
      setRelatedBumpingCaseId("");
      setShowForm(false);
      setMessage(t("created"));
      await refresh();
    } else {
      setError(t("createError"));
    }
  }

  async function setStatus(task: Task, status: TaskStatus) {
    if (
      !canMutateTaskAssignment(
        task,
        userId,
        session?.user?.unionId,
        session?.user?.localId,
        roles,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await refresh();
    else setError(t("updateError"));
  }

  async function reassignToSelf(task: Task) {
    if (
      !canMutateTaskAssignment(
        task,
        userId,
        session?.user?.unionId,
        session?.user?.localId,
        roles,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: userId }),
    });
    if (res.ok) await refresh();
    else setError(t("updateError"));
  }

  async function removeTask(task: Task) {
    if (
      !canDeleteTask(
        task,
        userId,
        session?.user?.unionId,
        session?.user?.localId,
        roles,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) await refresh();
    else setError(t("updateError"));
  }

  if (loading && tasks.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
          <p className="mt-1 text-gray-600">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite && (
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? t("cancel") : t("newTask")}
            </Button>
          )}
          <Link href="/app">
            <Button variant="outline">{th("backToDashboard")}</Button>
          </Link>
        </div>
      </div>

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="group"
        aria-label={t("filterLabel")}
      >
        {(["open", "mine", "done", "all"] as FilterMode[]).map((mode) => (
          <Button
            key={mode}
            type="button"
            variant={filter === mode ? "primary" : "outline"}
            onClick={() => {
              setLoading(true);
              setFilter(mode);
            }}
          >
            {t(`filter.${mode}`)}
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("openCount")}</p>
          <p className="text-3xl font-bold text-opseu-dark">{openCount}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("totalCount")}</p>
          <p className="text-3xl font-bold text-opseu-blue">{tasks.length}</p>
        </Card>
      </div>

      {message && (
        <p className="mt-4 text-sm text-green-700" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {showForm && canWrite && (
        <Card className="mt-6">
          <CardTitle>{t("newTask")}</CardTitle>
          <form className="mt-4 grid gap-3" onSubmit={handleCreate}>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">{t("fieldTitle")}</span>
              <Input
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={500}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">{t("fieldDue")}</span>
              <Input
                className="mt-1"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </label>
            {canPickAssignee && (
              <label className="block text-sm">
                <span className="font-medium text-gray-700">
                  {t("fieldAssignee")}
                </span>
                <Input
                  className="mt-1"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  placeholder={t("assigneeHint")}
                />
              </label>
            )}
            <label className="block text-sm">
              <span className="font-medium text-gray-700">
                {t("fieldGrievance")}
              </span>
              <Input
                className="mt-1"
                value={relatedGrievanceId}
                onChange={(e) => setRelatedGrievanceId(e.target.value)}
                placeholder={t("optionalId")}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">
                {t("fieldBumping")}
              </span>
              <Input
                className="mt-1"
                value={relatedBumpingCaseId}
                onChange={(e) => setRelatedBumpingCaseId(e.target.value)}
                placeholder={t("optionalId")}
              />
            </label>
            <Button type="submit">{t("create")}</Button>
          </form>
        </Card>
      )}

      <ul className="mt-8 space-y-3">
        {tasks.length === 0 ? (
          <li>
            <EmptyState
              title={t("empty")}
              action={
                canWrite ? (
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    {t("newTask")}
                  </Button>
                ) : undefined
              }
            />
          </li>
        ) : (
          tasks.map((task) => {
            const canMutate = canMutateTaskAssignment(
              task,
              userId,
              session?.user?.unionId,
              session?.user?.localId,
              roles,
            );
            const canRemove = canDeleteTask(
              task,
              userId,
              session?.user?.unionId,
              session?.user?.localId,
              roles,
            );
            const overdue =
              task.status === "open" &&
              !!task.dueAt &&
              new Date(task.dueAt).getTime() < now;
            return (
              <li key={task.id}>
                <Card
                  className={
                    task.status === "done" ? "opacity-70" : undefined
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>
                        {task.title}
                        {overdue ? (
                          <span className="ml-2 text-sm font-medium text-red-700">
                            {t("overdue")}
                          </span>
                        ) : null}
                      </CardTitle>
                      <p className="mt-1 text-sm text-gray-600">
                        {t("meta", {
                          status: t(`status.${task.status}`),
                          assignee: task.assigneeId,
                          due: task.dueAt
                            ? new Date(task.dueAt).toLocaleString()
                            : t("noDue"),
                        })}
                      </p>
                      {(task.relatedGrievanceId ||
                        task.relatedBumpingCaseId) && (
                        <p className="mt-1 text-xs text-gray-500">
                          {task.relatedGrievanceId
                            ? t("linkedGrievance", {
                                id: task.relatedGrievanceId,
                              })
                            : null}
                          {task.relatedBumpingCaseId
                            ? t("linkedBumping", {
                                id: task.relatedBumpingCaseId,
                              })
                            : null}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canMutate && task.status === "open" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void setStatus(task, "done")}
                        >
                          {t("markDone")}
                        </Button>
                      )}
                      {canMutate && task.status === "done" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void setStatus(task, "open")}
                        >
                          {t("reopen")}
                        </Button>
                      )}
                      {canMutate &&
                        elevated &&
                        task.assigneeId !== userId && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void reassignToSelf(task)}
                          >
                            {t("assignMe")}
                          </Button>
                        )}
                      {canRemove && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void removeTask(task)}
                        >
                          {t("delete")}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
