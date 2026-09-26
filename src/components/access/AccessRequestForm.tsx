"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Props = {
  kind: "local_interest" | "member_access";
  locale: string;
};

export function AccessRequestForm({ kind, locale }: Props) {
  const t = useTranslations("accessRequestForm");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [offerings, setOfferings] = useState<string[]>(
    kind === "member_access" ? ["local_portal"] : [],
  );
  const [language, setLanguage] = useState(locale === "fr" ? "fr" : "en");
  const successRef = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    if (!fd.get("consent")) {
      setError(t("errorConsent"));
      return;
    }
    if (!offerings.length) {
      setError(t("errorOfferings"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionKey: crypto.randomUUID(),
          kind,
          name: fd.get("name"),
          email: fd.get("email"),
          unionName: fd.get("unionName"),
          localName: fd.get("localName"),
          role: fd.get("role"),
          message: fd.get("message"),
          offerings,
          locale: language,
          consentAccepted: true,
          website: fd.get("website"),
        }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setError(t("errorRateLimited"));
          return;
        }
        if (res.status === 400) {
          setError(t("errorInvalid"));
          return;
        }
        setError(t("errorGeneric"));
        return;
      }
      setDone(true);
      queueMicrotask(() => successRef.current?.focus());
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card density="compact">
        <div
          ref={successRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="outline-none"
        >
          <p className="text-lg font-semibold text-opseu-dark">{t("success")}</p>
          <p className="mt-2 text-gray-700">{t("next")}</p>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" id="access-request-form">
      <h2 className="text-xl font-bold text-opseu-dark">
        {kind === "local_interest" ? t("localTitle") : t("memberTitle")}
      </h2>
      <Input
        name="name"
        label={t("name")}
        autoComplete="name"
        required
      />
      <Input
        name="email"
        label={t("email")}
        type="email"
        autoComplete="email"
        required
      />
      <Input
        name="unionName"
        label={t("union")}
        autoComplete="organization"
        required
      />
      <Input
        name="localName"
        label={t("local")}
        required
      />
      {kind === "local_interest" ? (
        <Input
          name="role"
          label={t("role")}
          placeholder={t("localRole")}
        />
      ) : null}
      {kind === "local_interest" ? (
        <fieldset>
          <legend className="text-sm font-medium text-gray-700">
            {t("offerings")}
          </legend>
          <p className="mt-1 text-xs text-gray-600">{t("offeringsHint")}</p>
          <div className="mt-2 space-y-2">
            <Checkbox
              label={t("hub")}
              checked={offerings.includes("officer_hub")}
              onChange={(e) =>
                setOfferings((v) =>
                  e.currentTarget.checked
                    ? [...new Set([...v, "officer_hub"])]
                    : v.filter((x) => x !== "officer_hub"),
                )
              }
            />
            <Checkbox
              label={t("portal")}
              checked={offerings.includes("local_portal")}
              onChange={(e) =>
                setOfferings((v) =>
                  e.currentTarget.checked
                    ? [...new Set([...v, "local_portal"])]
                    : v.filter((x) => x !== "local_portal"),
                )
              }
            />
          </div>
        </fieldset>
      ) : null}
      <Textarea name="message" label={t("message")} rows={4} />
      <Select
        name="language"
        label={t("language")}
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        <option value="en">{t("en")}</option>
        <option value="fr">{t("fr")}</option>
      </Select>
      <div className="hidden" aria-hidden="true">
        <Input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="space-y-1">
        <Checkbox name="consent" label={t("consent")} required />
        <p className="text-xs text-gray-600">
          {t("privacyLead")}{" "}
          <Link href="/privacy" className="font-semibold text-opseu-blue underline">
            {t("privacyLink")}
          </Link>
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy} className="min-h-11 w-full">
        {busy ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
