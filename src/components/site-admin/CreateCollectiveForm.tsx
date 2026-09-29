"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Callout } from "@/components/ui/Callout";
import type { BrandStructureOption } from "@/lib/site-admin/brand-structure-options";

type Props = {
  unionId: string;
  collectiveCatalog: BrandStructureOption[];
};

/**
 * Create a bargaining collective under a union (lives under the collectives panel).
 */
export function CreateCollectiveForm({ unionId, collectiveCatalog }: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [collectiveCatalogKey, setCollectiveCatalogKey] = useState("");
  const [collectiveCode, setCollectiveCode] = useState("");
  const [collectiveName, setCollectiveName] = useState("");
  const [busy, setBusy] = useState(false);
  const [collectiveStepUpRequired, setCollectiveStepUpRequired] =
    useState(false);
  const [collectiveMfaCode, setCollectiveMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function applyCollectiveCatalog(key: string) {
    setCollectiveCatalogKey(key);
    if (!key) return;
    const option = collectiveCatalog.find((row) => row.code === key);
    if (option) {
      setCollectiveCode(option.code);
      setCollectiveName(option.name);
    }
  }

  async function createCollective(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/site-admin/collectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unionId,
          code: collectiveCode.trim(),
          name: collectiveName.trim(),
          ...(collectiveStepUpRequired
            ? { mfaCode: collectiveMfaCode }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        collective?: { id: string };
      };
      if (!res.ok || !data.collective) {
        if (data.code === "mfa_step_up_required") {
          setCollectiveStepUpRequired(true);
          setError(t("createCollectiveMfaRequired"));
        } else if (data.code === "mfa_step_up_failed") {
          setCollectiveStepUpRequired(true);
          setCollectiveMfaCode("");
          setError(t("createCollectiveMfaFailed"));
        } else if (data.code === "mfa_step_up_limited") {
          setCollectiveStepUpRequired(true);
          setCollectiveMfaCode("");
          setError(t("createCollectiveMfaLimited"));
        } else if (
          data.code === "mfa_step_up_unavailable" ||
          data.code === "audit_unavailable"
        ) {
          setCollectiveStepUpRequired(false);
          setCollectiveMfaCode("");
          setError(t("createCollectiveMfaUnavailable"));
        } else {
          setCollectiveStepUpRequired(false);
          setCollectiveMfaCode("");
          setError(data.error ?? t("createCollectiveFailed"));
        }
        return;
      }
      setCollectiveCatalogKey("");
      setCollectiveCode("");
      setCollectiveName("");
      setCollectiveMfaCode("");
      setCollectiveStepUpRequired(false);
      setMessage(t("createCollectiveSaved"));
      router.refresh();
    } catch {
      setError(t("createCollectiveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={createCollective}
        className="space-y-3 rounded-md border border-opseu-gray/15 bg-white p-4"
      >
        <h3 className="text-base font-semibold text-opseu-dark">
          {t("createCollectiveTitle")}
        </h3>
        <p className="text-sm text-opseu-gray-dark">
          {t("createCollectiveBody")}
        </p>
        {collectiveCatalog.length > 0 ? (
          <Select
            label={t("createCollectiveFromBrand")}
            value={collectiveCatalogKey}
            disabled={busy}
            onChange={(event) => applyCollectiveCatalog(event.target.value)}
          >
            <option value="">{t("createCollectiveFromBrandPlaceholder")}</option>
            {collectiveCatalog.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name} ({option.code})
              </option>
            ))}
          </Select>
        ) : (
          <p className="text-xs text-opseu-gray-dark">
            {t("createCollectiveNoBrandCatalog")}{" "}
            <Link
              href="/app/site-admin/brand-styles"
              className="font-semibold text-opseu-blue underline underline-offset-2"
            >
              {t("createCollectiveBrandStylesLink")}
            </Link>
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t("createCollectiveCode")}
            value={collectiveCode}
            required
            disabled={busy}
            maxLength={64}
            className="min-h-11"
            onChange={(event) => {
              setCollectiveCatalogKey("");
              setCollectiveCode(event.target.value);
            }}
          />
          <Input
            label={t("createCollectiveName")}
            value={collectiveName}
            required
            disabled={busy}
            maxLength={200}
            className="min-h-11"
            onChange={(event) => {
              setCollectiveCatalogKey("");
              setCollectiveName(event.target.value);
            }}
          />
        </div>
        {collectiveStepUpRequired ? (
          <div className="space-y-2">
            <Input
              label={t("createCollectiveMfaCode")}
              value={collectiveMfaCode}
              onChange={(event) => setCollectiveMfaCode(event.target.value)}
              autoComplete="one-time-code"
              maxLength={32}
              autoFocus
              disabled={busy}
              className="min-h-11"
            />
            <p className="text-xs text-opseu-gray-dark">
              {t("createCollectiveMfaHelp")}
            </p>
          </div>
        ) : null}
        <Button
          type="submit"
          className="min-h-11"
          disabled={
            busy ||
            !collectiveCode.trim() ||
            !collectiveName.trim() ||
            (collectiveStepUpRequired && !collectiveMfaCode.trim())
          }
        >
          {t("createCollectiveSubmit")}
        </Button>
      </form>
      {error ? (
        <Callout tone="danger">
          <p className="font-semibold">{t("createLocalErrorTitle")}</p>
          <p className="mt-1">{error}</p>
        </Callout>
      ) : null}
      {message ? (
        <Callout tone="success">
          <p className="font-semibold">{t("createLocalSuccessTitle")}</p>
          <p className="mt-1">{message}</p>
        </Callout>
      ) : null}
    </div>
  );
}
