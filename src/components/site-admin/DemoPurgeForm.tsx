"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Counts = {
  users: number;
  unions: number;
  divisions: number;
  locals: number;
};

type Props = {
  counts: Counts;
  confirmPhrase: string;
};

export function DemoPurgeForm({ counts, confirmPhrase }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Counts | null>(null);
  const [pending, startTransition] = useTransition();

  const total =
    counts.users + counts.unions + counts.divisions + counts.locals;
  const ready =
    confirm === confirmPhrase && password.length > 0 && total > 0 && !pending;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/site-admin/demo/purge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm, password }),
        });
        const body = (await res.json().catch(() => null)) as {
          error?: string;
          deleted?: Counts;
          message?: string;
        } | null;
        if (!res.ok) {
          setError(body?.error ?? `Purge failed (${res.status})`);
          return;
        }
        setDone(body?.deleted ?? counts);
        setPassword("");
        setConfirm("");
        router.refresh();
      } catch {
        setError(
          "Network error — purge may not have run. Refresh and check the counts.",
        );
      }
    });
  }

  if (done) {
    return (
      <div
        className="mt-6 rounded-md border border-green-700/30 bg-green-50 p-4 text-sm text-opseu-dark"
        role="status"
      >
        <p className="font-semibold">Demo rows purged</p>
        <p className="mt-1 text-opseu-gray-dark">
          Removed {done.users} users, {done.unions} unions, {done.divisions}{" "}
          divisions, {done.locals} locals. Refresh shows the live residual
          count (should be zero unless new demo seed landed).
        </p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <p className="mt-6 text-sm text-opseu-gray-dark" role="status">
        No <code className="text-xs">is_demo</code> rows to purge.
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 space-y-4 rounded-md border border-red-700/25 bg-red-50/60 p-4"
    >
      <div>
        <h2 className="font-semibold text-opseu-dark">Purge demo rows</h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          Irreversible. Deletes the {total} flagged tenant rows and any
          casework under demo unions. Type{" "}
          <code className="text-xs">{confirmPhrase}</code> and re-enter your
          password.
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-opseu-dark">Confirmation</span>
        <input
          type="text"
          autoComplete="off"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded border border-opseu-gray/30 px-3 py-2 font-mono text-sm"
          placeholder={confirmPhrase}
          disabled={pending}
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-opseu-dark">Your password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-opseu-gray/30 px-3 py-2 text-sm"
          disabled={pending}
        />
      </label>

      {error ? (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!ready}
        className="rounded bg-red-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Purging…" : "Purge demo data"}
      </button>
    </form>
  );
}
