"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import type { InviteRoleOption } from "@/lib/tenant/access";
import { formatRoleLabel, formatRoleList } from "@/lib/auth/role-labels";
import type { UserRole } from "@/types/tenant";
import {
  UNION_LOCAL_SELECT_OTHER,
  UnionLocalSelect,
  emptyUnionLocalSelectValue,
  type LocalOption,
  type SubGroupOption,
  type UnionLocalSelectValue,
  type UnionOption,
} from "@/components/tenant/UnionLocalSelect";

type CreateInviteResponse = {
  id: string;
  email: string;
  expiresAt: string;
  acceptPath: string;
  token: string;
  emailSent?: boolean;
  emailReason?: string;
};

type PendingInvite = {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  status: string;
  localId?: string;
  expiresAt: string;
  createdAt: string;
  token?: string;
  acceptPath?: string;
};

type InvitesGetResponse = {
  invites: PendingInvite[];
  locals: LocalOption[];
  subGroups?: SubGroupOption[];
  unions?: UnionOption[];
  inviteRoles: InviteRoleOption[];
  canInvitePresident: boolean;
  canElevateLocalNumber?: boolean;
  isPlatformAdmin?: boolean;
  sessionLocalId: string | null;
  sessionUnionId?: string | null;
  selectedUnionId?: string | null;
  unionName?: string | null;
};

const emailUiEnabled = process.env.NEXT_PUBLIC_EMAIL_ENABLED === "true";

function readRequestId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("requestId");
}

export function InvitesBoard() {
  const t = useTranslations("invites");
  const tRoles = useTranslations("hub.roleLabels");
  const [requestId, setRequestId] = useState<string | null>(() => readRequestId());
  const [fulfilling, setFulfilling] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<InviteRoleOption[]>(["local_steward"]);
  const [sendEmailOnCreate, setSendEmailOnCreate] = useState(emailUiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateInviteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const [inviteRoles, setInviteRoles] = useState<InviteRoleOption[]>([
    "local_steward",
  ]);
  const [canInvitePresident, setCanInvitePresident] = useState(false);
  const [canElevate, setCanElevate] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [unions, setUnions] = useState<UnionOption[]>([]);
  const [locals, setLocals] = useState<LocalOption[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroupOption[]>([]);
  const [sessionUnionId, setSessionUnionId] = useState<string | null>(null);
  const [unionName, setUnionName] = useState<string | null>(null);
  const [sessionLocalId, setSessionLocalId] = useState<string | null>(null);
  const [teamLocal, setTeamLocal] = useState<UnionLocalSelectValue>(() =>
    emptyUnionLocalSelectValue(),
  );
  const [presidentLocal, setPresidentLocal] = useState<UnionLocalSelectValue>(
    () => emptyUnionLocalSelectValue(),
  );
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [presidentName, setPresidentName] = useState("");
  const [presidentEmail, setPresidentEmail] = useState("");
  const [presidentCollectionCode, setPresidentCollectionCode] = useState("");
  const [presidentCollectionName, setPresidentCollectionName] = useState("");
  const [presidentBusy, setPresidentBusy] = useState(false);
  const [presidentError, setPresidentError] = useState<string | null>(null);
  const [pendingCopiedId, setPendingCopiedId] = useState<string | null>(null);
  const [pendingSendingId, setPendingSendingId] = useState<string | null>(null);
  const [pendingEmailById, setPendingEmailById] = useState<
    Record<string, string>
  >({});

  async function refresh(selectedUnion?: string) {
    const unionQuery =
      selectedUnion ||
      (teamLocal.unionId && teamLocal.unionId !== UNION_LOCAL_SELECT_OTHER
        ? teamLocal.unionId
        : "");
    const qs = unionQuery
      ? `?unionId=${encodeURIComponent(unionQuery)}`
      : "";
    const res = await fetch(`/api/invites${qs}`);
    if (!res.ok) throw new Error("fail");
    const data = (await res.json()) as InvitesGetResponse;
    setInviteRoles(data.inviteRoles);
    setCanInvitePresident(data.canInvitePresident);
    setCanElevate(Boolean(data.canElevateLocalNumber ?? data.canInvitePresident));
    setIsPlatformAdmin(Boolean(data.isPlatformAdmin));
    setUnions(data.unions ?? []);
    setLocals(data.locals);
    setSubGroups(data.subGroups ?? []);
    setPending(data.invites);
    setSessionUnionId(data.sessionUnionId ?? null);
    setUnionName(data.unionName ?? null);
    setSessionLocalId(data.sessionLocalId);
    setRoles((prev) => {
      const allowed = new Set(data.inviteRoles);
      const next = prev.filter((r) => allowed.has(r));
      if (next.length > 0) return next;
      if (data.inviteRoles.includes("local_steward")) return ["local_steward"];
      return data.inviteRoles[0] ? [data.inviteRoles[0]] : [];
    });
    const lockedLocal = data.locals.find((l) => l.id === data.sessionLocalId);
    const defaultUnion =
      data.selectedUnionId ??
      data.sessionUnionId ??
      data.unions?.[0]?.id ??
      "";
    setTeamLocal((prev) => {
      if (data.isPlatformAdmin) {
        if (
          prev.unionId === UNION_LOCAL_SELECT_OTHER ||
          (prev.unionId &&
            (data.unions ?? []).some((u) => u.id === prev.unionId))
        ) {
          return prev;
        }
        return {
          ...emptyUnionLocalSelectValue(),
          unionId: defaultUnion,
          localId: data.sessionLocalId ?? "",
        };
      }
      if (data.canElevateLocalNumber || data.canInvitePresident) {
        if (prev.localId && data.locals.some((l) => l.id === prev.localId)) {
          return prev;
        }
        return {
          ...emptyUnionLocalSelectValue(),
          unionId: data.sessionUnionId ?? "",
          localId: data.sessionLocalId ?? data.locals[0]?.id ?? "",
        };
      }
      return {
        ...emptyUnionLocalSelectValue(),
        unionId: data.sessionUnionId ?? "",
        localId: data.sessionLocalId ?? "",
        localNumber: lockedLocal?.localNumber ?? "",
      };
    });
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) setLoadError(t("loadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
    // Initial load only — refresh() closes over form state and would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/access-requests/${requestId}`);
        if (!res.ok) {
          if (!cancelled) setError(t("fulfillingRequestLoadFailed"));
          return;
        }
        const data = (await res.json()) as {
          item?: {
            name?: string;
            email?: string;
            unionId?: string;
            localId?: string;
            kind?: string;
          };
        };
        const item = data.item;
        if (!item || cancelled) return;
        if (item.email) setEmail(item.email);
        if (item.name) setName(item.name);
        if (item.name && item.email) {
          setFulfilling({ name: item.name, email: item.email });
        }
        if (item.kind === "local_interest") {
          setRoles(["local_president"]);
        }
        if (item.unionId || item.localId) {
          setTeamLocal((prev) => ({
            ...prev,
            unionId: item.unionId ?? prev.unionId,
            localId: item.localId ?? prev.localId,
          }));
          setPresidentLocal((prev) => ({
            ...prev,
            unionId: item.unionId ?? prev.unionId,
            localId: item.localId ?? prev.localId,
          }));
        }
      } catch {
        if (!cancelled) setError(t("fulfillingRequestLoadFailed"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId, t]);

  function scopePayload(scope: UnionLocalSelectValue): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (scope.unionId === UNION_LOCAL_SELECT_OTHER) {
      payload.newUnionName = scope.newUnionName.trim();
    } else if (scope.unionId) {
      payload.unionId = scope.unionId;
    }
    if (scope.localId) payload.localId = scope.localId;
    if (scope.localNumber.trim()) {
      payload.localNumber = scope.localNumber.trim();
      if (scope.localSubText.trim()) {
        payload.localSubText = scope.localSubText.trim();
      }
    }
    if (scope.bargainingUnitId) {
      payload.bargainingUnitId = scope.bargainingUnitId;
    }
    if (requestId) payload.requestId = requestId;
    return payload;
  }

  function toggleRole(role: InviteRoleOption) {
    setRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role],
    );
  }

  function applyEmailResult(data: CreateInviteResponse) {
    setCreated(data);
    if (data.emailSent === true) {
      setEmailStatus(t("emailSent"));
    } else if (data.emailSent === false) {
      setEmailStatus(
        data.emailReason === "not_configured"
          ? t("emailNotConfigured")
          : t("emailSendError"),
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    setCopied(false);
    setEmailStatus(null);
    if (roles.length === 0) {
      setError(t("rolesRequired"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          roles,
          ...scopePayload(teamLocal),
          ...(emailUiEnabled && sendEmailOnCreate ? { sendEmail: true } : {}),
        }),
      });
      if (!res.ok) {
        setError(t("createError"));
        return;
      }
      const data = (await res.json()) as CreateInviteResponse;
      applyEmailResult(data);
      setEmail("");
      setName("");
      setRequestId(null);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("requestId");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
      await refresh(
        teamLocal.unionId !== UNION_LOCAL_SELECT_OTHER
          ? teamLocal.unionId
          : undefined,
      );
    } catch {
      setError(t("createError"));
    } finally {
      setLoading(false);
    }
  }

  async function handlePresidentInvite(e: React.FormEvent) {
    e.preventDefault();
    setPresidentError(null);
    setCreated(null);
    setCopied(false);
    setEmailStatus(null);
    setPresidentBusy(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: presidentEmail,
          name: presidentName,
          roles: ["local_president"],
          ...scopePayload(presidentLocal),
          ...(presidentCollectionCode.trim() && presidentCollectionName.trim()
            ? {
                collectionCode: presidentCollectionCode.trim(),
                collectionName: presidentCollectionName.trim(),
              }
            : {}),
          ...(emailUiEnabled ? { sendEmail: true } : {}),
        }),
      });
      if (!res.ok) {
        setPresidentError(t("presidentCreateError"));
        return;
      }
      const data = (await res.json()) as CreateInviteResponse;
      applyEmailResult(data);
      setPresidentEmail("");
      setPresidentName("");
      setPresidentLocal(emptyUnionLocalSelectValue());
      setPresidentCollectionCode("");
      setPresidentCollectionName("");
      setRequestId(null);
      await refresh(
        presidentLocal.unionId !== UNION_LOCAL_SELECT_OTHER
          ? presidentLocal.unionId
          : undefined,
      );
    } catch {
      setPresidentError(t("presidentCreateError"));
    } finally {
      setPresidentBusy(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${created.acceptPath}`
        : created.acceptPath;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError(t("copyError"));
    }
  }

  async function sendInviteEmail() {
    if (!created?.token) return;
    setSendingEmail(true);
    setEmailStatus(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/invites/${encodeURIComponent(created.token)}/email`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reason?: string;
      };
      if (res.ok && data.ok) {
        setEmailStatus(t("emailSent"));
      } else if (data.reason === "not_configured" || res.status === 503) {
        setEmailStatus(t("emailNotConfigured"));
      } else {
        setEmailStatus(t("emailSendError"));
      }
    } catch {
      setEmailStatus(t("emailSendError"));
    } finally {
      setSendingEmail(false);
    }
  }

  async function copyPendingLink(row: PendingInvite) {
    if (!row.acceptPath) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${row.acceptPath}`
        : row.acceptPath;
    try {
      await navigator.clipboard.writeText(url);
      setPendingCopiedId(row.id);
    } catch {
      setError(t("copyError"));
    }
  }

  async function resendPendingEmail(row: PendingInvite) {
    if (!row.token) return;
    setPendingSendingId(row.id);
    setPendingEmailById((prev) => ({ ...prev, [row.id]: "" }));
    try {
      const res = await fetch(
        `/api/invites/${encodeURIComponent(row.token)}/email`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reason?: string;
      };
      const status =
        res.ok && data.ok
          ? t("emailSent")
          : data.reason === "not_configured" || res.status === 503
            ? t("emailNotConfigured")
            : t("emailSendError");
      setPendingEmailById((prev) => ({ ...prev, [row.id]: status }));
    } catch {
      setPendingEmailById((prev) => ({
        ...prev,
        [row.id]: t("emailSendError"),
      }));
    } finally {
      setPendingSendingId(null);
    }
  }

  const localLabel = (id: string | undefined) => {
    const local = locals.find((l) => l.id === id);
    return local
      ? t("localLabel", { number: local.localNumber })
      : id
        ? id
        : t("localUnknown");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-prose text-gray-600">{t("subtitle")}</p>
      </header>

      <Callout tone="muted">
        <p>{emailUiEnabled ? t("emailReady") : t("emailDeferred")}</p>
      </Callout>

      {loadError && (
        <p className="text-sm text-red-600" role="alert">
          {loadError}
        </p>
      )}

      {canInvitePresident && (
        <section
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
          aria-labelledby="invite-president-heading"
        >
          <h2
            id="invite-president-heading"
            className="text-lg font-semibold text-opseu-dark"
          >
            {t("presidentTitle")}
          </h2>
          <p className="text-sm text-gray-600">{t("presidentHint")}</p>
          <form onSubmit={handlePresidentInvite} className="space-y-3">
            <Input
              label={t("name")}
              value={presidentName}
              onChange={(e) => setPresidentName(e.target.value)}
              required
              autoComplete="name"
            />
            <Input
              label={t("email")}
              type="email"
              value={presidentEmail}
              onChange={(e) => setPresidentEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <UnionLocalSelect
              mode={isPlatformAdmin ? "platform" : "elevate"}
              unions={unions}
              locals={locals}
              subGroups={subGroups}
              lockedUnionId={sessionUnionId}
              value={presidentLocal}
              onChange={(next) => {
                setPresidentLocal(next);
                if (
                  isPlatformAdmin &&
                  next.unionId &&
                  next.unionId !== UNION_LOCAL_SELECT_OTHER &&
                  next.unionId !== presidentLocal.unionId
                ) {
                  void refresh(next.unionId);
                }
              }}
              disabled={presidentBusy}
              allowCreateLocal
            />
            <p className="text-sm text-gray-600">{t("presidentCollectionHint")}</p>
            <Input
              label={t("optionalCollectionCode")}
              value={presidentCollectionCode}
              onChange={(e) => setPresidentCollectionCode(e.target.value)}
              autoComplete="off"
            />
            <Input
              label={t("optionalCollectionName")}
              value={presidentCollectionName}
              onChange={(e) => setPresidentCollectionName(e.target.value)}
              autoComplete="off"
            />
            {presidentError && (
              <p className="text-sm text-red-600" role="alert">
                {presidentError}
              </p>
            )}
            <Button type="submit" disabled={presidentBusy} className="min-h-11">
              {presidentBusy ? t("creating") : t("invitePresident")}
            </Button>
          </form>
        </section>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-3">
          <h2 className="text-lg font-semibold text-opseu-dark">
            {t("teamTitle")}
          </h2>
          <Input
            label={t("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
          <Input
            label={t("email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          {canElevate ? (
            <UnionLocalSelect
              mode={isPlatformAdmin ? "platform" : "elevate"}
              unions={unions}
              locals={locals}
              subGroups={subGroups}
              lockedUnionId={sessionUnionId}
              value={teamLocal}
              onChange={(next) => {
                setTeamLocal(next);
                if (
                  isPlatformAdmin &&
                  next.unionId &&
                  next.unionId !== UNION_LOCAL_SELECT_OTHER &&
                  next.unionId !== teamLocal.unionId
                ) {
                  void refresh(next.unionId);
                }
              }}
              disabled={loading}
              allowCreateLocal
            />
          ) : (
            <UnionLocalSelect
              mode="president"
              locals={locals}
              subGroups={subGroups}
              lockedUnionId={sessionUnionId}
              lockedUnionName={unionName}
              lockedLocalId={sessionLocalId}
              lockedLocalNumber={
                locals.find((l) => l.id === sessionLocalId)?.localNumber ?? null
              }
              value={teamLocal}
              onChange={setTeamLocal}
              disabled={loading}
            />
          )}
          {requestId ? (
            <Callout tone="muted">
              <p>
                {fulfilling
                  ? t("fulfillingRequest", {
                      name: fulfilling.name,
                      email: fulfilling.email,
                    })
                  : t("fulfillingRequestFallback", { id: requestId })}
              </p>
            </Callout>
          ) : null}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">
              {t("roles")}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {inviteRoles.map((role) => (
                <Checkbox
                  key={role}
                  checked={roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  label={formatRoleLabel(role, tRoles)}
                />
              ))}
            </div>
          </fieldset>
          {emailUiEnabled && (
            <Checkbox
              checked={sendEmailOnCreate}
              onChange={() => setSendEmailOnCreate((v) => !v)}
              label={t("sendEmailOnCreate")}
            />
          )}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="min-h-11">
            {loading ? t("creating") : t("create")}
          </Button>
        </form>

        <div className="space-y-4">
          {created && (
            <section
              className="space-y-2 rounded-lg border border-gray-200 bg-white p-4"
              aria-labelledby="invite-created-heading"
            >
              <h2
                id="invite-created-heading"
                className="text-sm font-medium text-gray-800"
              >
                {t("createdTitle")}
              </h2>
              <p className="text-sm text-gray-600">
                {t("createdBody", { email: created.email })}
              </p>
              <p className="break-all font-mono text-xs text-gray-800">
                {created.acceptPath}
              </p>
              <p className="text-xs text-gray-500">
                {t("expires", {
                  date: new Date(created.expiresAt).toLocaleString(),
                })}
              </p>
              {emailStatus && (
                <p className="text-sm text-gray-700" role="status">
                  {emailStatus}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void copyLink()}
                  className="min-h-11"
                >
                  {copied ? t("copied") : t("copyLink")}
                </Button>
                {emailUiEnabled && (
                  <Button
                    type="button"
                    onClick={() => void sendInviteEmail()}
                    disabled={sendingEmail}
                    className="min-h-11"
                  >
                    {sendingEmail ? t("sendingEmail") : t("sendEmail")}
                  </Button>
                )}
              </div>
            </section>
          )}

          <section
            className="space-y-2 rounded-lg border border-gray-200 bg-white p-4"
            aria-labelledby="pending-invites-heading"
          >
            <h2
              id="pending-invites-heading"
              className="text-sm font-medium text-gray-800"
            >
              {t("pendingTitle")}
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-gray-600">{t("pendingEmpty")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pending.map((row) => (
                  <li
                    key={row.id}
                    className="border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                  >
                    <p className="font-medium text-gray-800">
                      {row.name} · {row.email}
                    </p>
                    <p className="text-gray-600">
                      {formatRoleList(row.roles, tRoles)}{" "}
                      · {localLabel(row.localId)} · {t(`status.${row.status}`)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("expires", {
                        date: new Date(row.expiresAt).toLocaleString(),
                      })}
                    </p>
                    {row.status === "pending" && row.acceptPath && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11"
                          onClick={() => void copyPendingLink(row)}
                        >
                          {pendingCopiedId === row.id
                            ? t("copied")
                            : t("copyLink")}
                        </Button>
                        {emailUiEnabled && row.token && (
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-11"
                            disabled={pendingSendingId === row.id}
                            onClick={() => void resendPendingEmail(row)}
                          >
                            {pendingSendingId === row.id
                              ? t("sendingEmail")
                              : t("resendEmail")}
                          </Button>
                        )}
                      </div>
                    )}
                    {pendingEmailById[row.id] && (
                      <p className="mt-1 text-xs text-gray-600" role="status">
                        {pendingEmailById[row.id]}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
