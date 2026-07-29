"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMentionableRoster } from "@/components/discussions/DiscussionPostCard";
import { HubReactionBar } from "@/components/hub/HubReactionBar";
import { MentionText } from "@/components/hub/MentionText";
import { useHubPoll } from "@/components/hub/useHubPoll";
import {
  canAssignOthers,
  canCreateTask,
  canDeleteTask,
  canMutateTaskAssignment,
  isElevatedTaskRole,
} from "@/lib/tasks/access";
import type { Task, TaskStatus } from "@/types/task";
import type { HubReactionKind } from "@/types/hub-social";
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

  const roster = useMentionableRoster();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("open");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [relatedGrievanceId, setRelatedGrievanceId] = useState("");
  const [relatedBumpingCaseId, setRelatedBumpingCaseId] = useState("");
  const [now] = useState(() => Date.now());
  const lastSyncRef = useRef<string>(new Date().toISOString());

  const refresh = useCallback(async (since?: string) => {
    const params = new URLSearchParams();
    if (filter === "mine") params.set("mine", "1");
    if (filter === "open" || filter === "done") params.set("status", filter);
    if (since) params.set("since", since);
    const res = await fetch(`/api/tasks?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { changed?: boolean; tasks: Task[] };
      if (since && data.changed === false) return;
      setTasks(data.tasks);
      lastSyncRef.current = new Date().toISOString();
      setError(null);
    } else {
      setError(t("loadError"));
    }
  }, [filter, t]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (filter === "mine") params.set("mine", "1");
    if (filter === "open" || filter === "done") params.set("status", filter);
    void fetch(`/api/tasks?${params.toString()}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { tasks: Task[] };
        setTasks(data.tasks);
        lastSyncRef.current = new Date().toISOString();
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, t]);

  useHubPoll(!loading, () => refresh(lastSyncRef.current).catch(() => undefined));

  const openCount = useMemo(
    () => tasks.filter((task) => task.status === "open").length,
    [tasks],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    const body: Record<string, string> = { title };
    if (notes.trim()) body.notes = notes.trim();
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
      setNotes("");
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

  async function toggleTaskReaction(task: Task, kind: HubReactionKind) {
    const res = await fetch(`/api/tasks/${task.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    const data = (await res.json()) as { task: Task };
    setTasks((current) =>
      current.map((row) => (row.id === data.task.id ? data.task : row)),
    );
    lastSyncRef.current = new Date().toISOString();
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
          <p className="mt-1 text-xs text-gray-500">{t("livePollHint")}</p>
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

      <div className="mt-6 xl:grid xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] xl:items-start xl:gap-6">
        <div className="space-y-4">
          <div
            className="flex flex-wrap gap-2 xl:flex-col"
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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Card>
              <p className="text-sm font-medium text-gray-500">{t("openCount")}</p>
              <p className="text-3xl font-bold text-opseu-dark">{openCount}</p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-gray-500">{t("totalCount")}</p>
              <p className="text-3xl font-bold text-opseu-blue">{tasks.length}</p>
            </Card>
          </div>
        </div>

        <div>
      {message && (
        <p className="text-sm text-green-700" role="status">
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
              <span className="font-medium text-gray-700">{t("fieldNotes")}</span>
              <Textarea
                className="mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t("notesHint")}
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

      <ul
        className={
          filter === "all"
            ? "mt-8 space-y-3 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0"
            : "mt-8 space-y-3"
        }
      >
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
                      {task.notes ? (
                        <div className="mt-2">
                          <MentionText body={task.notes} roster={roster} />
                        </div>
                      ) : null}
                      <HubReactionBar
                        reactions={task.reactions}
                        currentUserId={userId}
                        onToggle={(kind) => void toggleTaskReaction(task, kind)}
                      />
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
      </div>
    </div>
  );
}
