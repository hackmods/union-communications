"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { newLocalLinkId } from "@/lib/utils/local-links";
import type { LocalLink } from "@/types/entities";

interface LocalLinksEditorProps {
  websiteUrl: string;
  facebookUrl: string;
  customLinks: LocalLink[];
  onWebsiteChange: (url: string) => void;
  onFacebookChange: (url: string) => void;
  onCustomLinksChange: (links: LocalLink[]) => void;
  /** Compact mode for onboarding */
  compact?: boolean;
}

export function LocalLinksEditor({
  websiteUrl,
  facebookUrl,
  customLinks,
  onWebsiteChange,
  onFacebookChange,
  onCustomLinksChange,
  compact = false,
}: LocalLinksEditorProps) {
  const t = useTranslations("localLinks");

  const updateCustom = (id: string, patch: Partial<LocalLink>) => {
    onCustomLinksChange(
      customLinks.map((link) => (link.id === id ? { ...link, ...patch } : link)),
    );
  };

  const removeCustom = (id: string) => {
    onCustomLinksChange(customLinks.filter((link) => link.id !== id));
  };

  const addCustom = () => {
    onCustomLinksChange([
      ...customLinks,
      { id: newLocalLinkId(), label: "", url: "" },
    ]);
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact ? (
        <div>
          <h3 className="text-lg font-bold text-opseu-dark">{t("title")}</h3>
          <p className="mt-1 text-sm text-gray-600">{t("description")}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-600">{t("optionalHint")}</p>
      )}

      <Input
        label={t("websiteUrl")}
        value={websiteUrl}
        onChange={(e) => onWebsiteChange(e.target.value)}
        placeholder="https://"
      />
      <Input
        label={t("facebookUrl")}
        value={facebookUrl}
        onChange={(e) => onFacebookChange(e.target.value)}
        placeholder="https://facebook.com/groups/..."
      />

      <div className="space-y-3">
        <p className="text-sm font-medium">{t("customHeading")}</p>
        {customLinks.map((link) => (
          <div
            key={link.id}
            className="grid gap-2 rounded-md border border-gray-200 p-3 sm:grid-cols-[1fr_1.4fr_auto]"
          >
            <Input
              label={t("linkLabel")}
              value={link.label}
              onChange={(e) => updateCustom(link.id, { label: e.target.value })}
              placeholder={t("linkLabelPlaceholder")}
            />
            <Input
              label={t("linkUrl")}
              value={link.url}
              onChange={(e) => updateCustom(link.id, { url: e.target.value })}
              placeholder="https://"
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeCustom(link.id)}
              >
                {t("removeLink")}
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addCustom}>
          {t("addLink")}
        </Button>
      </div>
    </div>
  );
}
