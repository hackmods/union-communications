"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { USER_ROLES } from "@/lib/auth/role-labels";
import type { UserRole } from "@/types/tenant";

type Props = {
  userId: string;
  initialRoles: string[];
  archived: boolean;
};

export function EditRolesForm({ userId, initialRoles, archived }: Props) {
  const t = useTranslations("hub.platformOperator");
  const tRoles = useTranslations("hub.roleLabels");
  const router = useRouter();
  const [roles, setRoles] = useState<UserRole[]>(() =>
    initialRoles.filter((r): r is UserRole =>
      (USER_ROLES as readonly string[]).includes(r),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function toggle(role: UserRole, checked: boolean) {
    setRoles((prev) => {
      if (checked) return [...new Set([...prev, role])];
      return prev.filter((r) => r !== role);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (roles.length === 0) {
      setError(t("editRolesNeedOne"));
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/site-admin/users/${encodeURIComponent(userId)}/roles`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles, ...(mfaCode ? { mfaCode } : {}) }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (data.code === "mfa_step_up_required") {
          setStepUpRequired(true);
          setError(t("editRolesStepUpRequired"));
          return;
        }
        if (data.code === "mfa_step_up_failed") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("editRolesStepUpFailed"));
          return;
        }
        if (data.code === "mfa_step_up_limited") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("editRolesStepUpLimited"));
          return;
        }
        if (data.code === "mfa_step_up_unavailable") {
          setError(t("editRolesStepUpUnavailable"));
          return;
        }
        setError(
          data.code === "sole_platform_admin"
            ? t("editRolesSoleAdmin")
            : (data.error ?? t("editRolesFailed")),
        );
        return;
      }
      setMfaCode("");
      setStepUpRequired(false);
      setSuccess(t("editRolesSaved"));
      router.refresh();
    } catch {
      setError(t("editRolesFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="mt-6 space-y-4 rounded-md border border-opseu-gray/15 bg-white p-4"
    >
      <div>
        <h2 className="text-base font-semibold text-opseu-dark">
          {t("editRolesTitle")}
        </h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("editRolesBody")}</p>
      </div>

      {error ? (
        <Callout tone="danger" role="alert" measure="fill">
          {error}
        </Callout>
      ) : null}
      {success ? (
        <Callout tone="brand" role="status" measure="fill">
          {success}
        </Callout>
      ) : null}

      <fieldset disabled={archived || busy} className="space-y-2">
        <legend className="sr-only">{t("editRolesTitle")}</legend>
        {USER_ROLES.map((role) => (
          <Checkbox
            key={role}
            id={`role-${role}`}
            checked={roles.includes(role)}
            onChange={(e) => toggle(role, e.target.checked)}
            label={tRoles(role)}
          />
        ))}
      </fieldset>

      {stepUpRequired ? (
        <div className="space-y-1">
          <Input
            label={t("editRolesMfaCode")}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={32}
            required
            disabled={archived || busy}
            aria-describedby="edit-roles-mfa-help"
          />
          <p id="edit-roles-mfa-help" className="text-xs text-opseu-gray-dark">
            {t("editRolesStepUpHelp")}
          </p>
        </div>
      ) : null}

      <Button type="submit" disabled={archived || busy || roles.length === 0}>
        {busy ? t("editRolesSaving") : t("editRolesSubmit")}
      </Button>
      {archived ? (
        <p className="text-xs text-opseu-gray-dark">
          {t("editRolesArchived")}
        </p>
      ) : null}
    </form>
  );
}
