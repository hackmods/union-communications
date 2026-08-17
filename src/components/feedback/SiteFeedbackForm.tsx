"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  SITE_FEEDBACK_CATEGORIES,
  type SiteFeedbackCategory,
} from "@/types/platform-feedback";

export type SiteFeedbackFormVariant = "public" | "hub" | "portal";

export function SiteFeedbackForm({
  variant,
  defaultCategory,
  defaultPagePath,
  defaultEmail,
  defaultName,
  memoryBackend,
}: {
  variant: SiteFeedbackFormVariant;
  defaultCategory?: SiteFeedbackCategory;
  defaultPagePath?: string;
  defaultEmail?: string;
  defaultName?: string;
  memoryBackend: boolean;
}) {
  const t = useTranslations("feedbackPage");
  const locale = useLocale();
  const initialCategory = useMemo<SiteFeedbackCategory>(() => {
    if (
      defaultCategory &&
      SITE_FEEDBACK_CATEGORIES.includes(defaultCategory)
    ) {
      return defaultCategory;
    }
    return "idea";
  }, [defaultCategory]);

  const [category, setCategory] = useState<SiteFeedbackCategory>(initialCategory);
  const [body, setBody] = useState("");
  const [pagePath, setPagePath] = useState(defaultPagePath ?? "");
  const [contactEmail, setContactEmail] = useState(defaultEmail ?? "");
  const [contactName, setContactName] = useState(defaultName ?? "");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <Callout tone="success" role="status">
        <p className="font-semibold text-opseu-dark">{t("successTitle")}</p>
        <p className="mt-1">{t("successBody")}</p>
      </Callout>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError(t("consentRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (variant === "hub" || variant === "portal") {
        headers["x-unionops-surface"] = variant;
      }
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers,
        body: JSON.stringify({
          category,
          body,
          pagePath: pagePath.trim() || undefined,
          locale: locale === "fr" ? "fr" : "en",
          contactEmail: contactEmail.trim() || undefined,
          contactName: contactName.trim() || undefined,
          consentAccepted: true,
          website,
        }),
      });
      if (res.status === 429) {
        setError(t("rateLimited"));
        return;
      }
      if (res.status === 503) {
        setError(t("notDurable"));
        return;
      }
      if (!res.ok) {
        setError(t("error"));
        return;
      }
      setDone(true);
    } catch {
      setError(t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {variant !== "public" ? (
        <Callout tone="muted">
          <p>{t("hubLead")}</p>
        </Callout>
      ) : null}

      {memoryBackend ? (
        <Callout tone="warning">
          <p>{t("memoryWarning")}</p>
        </Callout>
      ) : null}

      <Select
        label={t("categoryLabel")}
        name="category"
        value={category}
        onChange={(e) =>
          setCategory(e.target.value as SiteFeedbackCategory)
        }
        required
      >
        {SITE_FEEDBACK_CATEGORIES.map((value) => (
          <option key={value} value={value}>
            {t(`categories.${value}`)}
          </option>
        ))}
      </Select>

      <Textarea
        label={t("bodyLabel")}
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        minLength={20}
        maxLength={4000}
        rows={8}
        required
        placeholder={t("bodyPlaceholder")}
      />

      <Input
        label={t("pageLabel")}
        name="pagePath"
        value={pagePath}
        onChange={(e) => setPagePath(e.target.value)}
        placeholder={t("pagePlaceholder")}
      />
      <p className="text-sm text-gray-600">{t("pageHint")}</p>

      <Input
        label={t("nameLabel")}
        name="contactName"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        maxLength={80}
        autoComplete="name"
      />

      <Input
        label={t("emailLabel")}
        name="contactEmail"
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        autoComplete="email"
      />
      <p className="text-sm text-gray-600">{t("emailHint")}</p>

      <div className="hidden" aria-hidden="true">
        <label>
          {t("honeypotLabel")}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <label className="flex items-start gap-3 text-sm text-gray-800">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-gray-300 text-opseu-blue focus:ring-opseu-blue"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        <span>{t("consent")}</span>
      </label>

      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
