"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { newMembershipUrlId } from "@/lib/utils/local-links";
import type { MembershipUrl, MembershipUrlAudience } from "@/types/entities";

interface MembershipUrlsEditorProps {
  membershipUrls: MembershipUrl[];
  onChange: (urls: MembershipUrl[]) => void;
  /** Compact mode for onboarding */
  compact?: boolean;
}

const AUDIENCE_OPTIONS: MembershipUrlAudience[] = [
  "all",
  "full_time",
  "part_time",
];

export function MembershipUrlsEditor({
  membershipUrls,
  onChange,
  compact = false,
}: MembershipUrlsEditorProps) {
  const t = useTranslations("membershipUrls");

  const update = (id: string, patch: Partial<MembershipUrl>) => {
    onChange(
      membershipUrls.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const remove = (id: string) => {
    onChange(membershipUrls.filter((row) => row.id !== id));
  };

  const add = () => {
    onChange([
      ...membershipUrls,
      {
        id: newMembershipUrlId(),
        label: "",
        url: "",
        audience: "all",
        primary: membershipUrls.length === 0,
      },
    ]);
  };

  const setPrimary = (id: string) => {
    onChange(
      membershipUrls.map((row) => ({
        ...row,
        primary: row.id === id,
      })),
    );
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

      <div className="space-y-3">
        {membershipUrls.map((row) => (
          <div
            key={row.id}
            className="grid gap-2 rounded-md border border-gray-200 p-3 sm:grid-cols-2"
          >
            <Input
              label={t("linkLabel")}
              value={row.label}
              onChange={(e) => update(row.id, { label: e.target.value })}
              placeholder={t("linkLabelPlaceholder")}
            />
            <Input
              label={t("linkUrl")}
              value={row.url}
              onChange={(e) => update(row.id, { url: e.target.value })}
              placeholder="https://"
            />
            <div>
              <label
                htmlFor={`membership-audience-${row.id}`}
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t("audience")}
              </label>
              <select
                id={`membership-audience-${row.id}`}
                className="min-h-11 w-full rounded-md border border-gray-300 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
                value={row.audience}
                onChange={(e) =>
                  update(row.id, {
                    audience: e.target.value as MembershipUrlAudience,
                  })
                }
              >
                {AUDIENCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`audiences.${opt}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="membership-primary"
                  checked={row.primary === true}
                  onChange={() => setPrimary(row.id)}
                />
                {t("primary")}
              </label>
              <Button type="button" variant="ghost" onClick={() => remove(row.id)}>
                {t("removeLink")}
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={add}>
          {t("addLink")}
        </Button>
      </div>
    </div>
  );
}
