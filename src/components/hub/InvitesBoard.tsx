"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  INVITE_ROLE_OPTIONS,
  type InviteRoleOption,
} from "@/lib/tenant/access";

type CreateInviteResponse = {
  id: string;
  email: string;
  expiresAt: string;
  acceptPath: string;
  token: string;
  emailSent?: boolean;
  emailReason?: string;
};

const emailUiEnabled =
  process.env.NEXT_PUBLIC_EMAIL_ENABLED === "true";

export function InvitesBoard() {
  const t = useTranslations("invites");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<InviteRoleOption[]>(["local_steward"]);
  const [sendEmailOnCreate, setSendEmailOnCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateInviteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  function toggleRole(role: InviteRoleOption) {
    setRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role],
    );
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
          ...(emailUiEnabled && sendEmailOnCreate
            ? { sendEmail: true }
            : {}),
        }),
      });
      if (!res.ok) {
        setError(t("createError"));
        return;
      }
      const data = (await res.json()) as CreateInviteResponse;
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
      setEmail("");
      setName("");
      setRoles(["local_steward"]);
      setSendEmailOnCreate(false);
    } catch {
      setError(t("createError"));
    } finally {
      setLoading(false);
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

  return (
    <PageShell size="focus" className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-gray-600">{t("subtitle")}</p>
      </header>

      <Callout tone="muted">
        <p>{emailUiEnabled ? t("emailReady") : t("emailDeferred")}</p>
      </Callout>

      <form onSubmit={handleSubmit} className="space-y-3">
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
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700">
            {t("roles")}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {INVITE_ROLE_OPTIONS.map((role) => (
              <Checkbox
                key={role}
                checked={roles.includes(role)}
                onChange={() => toggleRole(role)}
                label={t(`role.${role}`)}
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
    </PageShell>
  );
}
