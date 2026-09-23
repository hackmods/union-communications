"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input, Textarea } from "@/components/ui/Input";
import { useStewardGuideDraft } from "@/hooks/use-steward-guide-draft";
import {
  clearCaSnippetsDraft,
  createEmptyCaSnippetsDraft,
  loadCaSnippetsDraft,
  newCaSnippet,
  saveCaSnippetsDraft,
} from "@/lib/comms/ca-snippets-draft";
import { guideCtaOutlineClassSm } from "@/components/comms/guideCtaClasses";

export default function CaSnippetsPage() {
  const t = useTranslations("caSnippets");
  const { draft, setDraft, clear, saveFailed } = useStewardGuideDraft({
    load: loadCaSnippetsDraft,
    save: saveCaSnippetsDraft,
    createEmpty: createEmptyCaSnippetsDraft,
    clearStorage: clearCaSnippetsDraft,
  });

  const form = (
    <div className="space-y-4">
      <Callout tone="muted" measure="fill">
        <p>{t("hubHint")}</p>
        <Link href="/app/snippets" className={`${guideCtaOutlineClassSm} mt-3`}>
          {t("openHub")}
        </Link>
      </Callout>
      {saveFailed ? (
        <Callout tone="muted" role="status">
          {t("draftSaveFailed")}
        </Callout>
      ) : null}
      <Button
        type="button"
        onClick={() =>
          setDraft((prev) => ({
            snippets: [newCaSnippet(), ...prev.snippets],
          }))
        }
      >
        {t("add")}
      </Button>
      {draft.snippets.length === 0 ? (
        <p className="text-sm text-gray-600">{t("empty")}</p>
      ) : (
        draft.snippets.map((row) => (
          <div
            key={row.id}
            className="space-y-2 rounded-lg border border-gray-200 p-3"
          >
            <Input
              label={t("fields.title")}
              value={row.title}
              onChange={(e) =>
                setDraft((prev) => ({
                  snippets: prev.snippets.map((s) =>
                    s.id === row.id ? { ...s, title: e.target.value } : s,
                  ),
                }))
              }
            />
            <Textarea
              label={t("fields.body")}
              rows={4}
              value={row.body}
              onChange={(e) =>
                setDraft((prev) => ({
                  snippets: prev.snippets.map((s) =>
                    s.id === row.id ? { ...s, body: e.target.value } : s,
                  ),
                }))
              }
            />
            <Input
              label={t("fields.tags")}
              value={row.tags}
              onChange={(e) =>
                setDraft((prev) => ({
                  snippets: prev.snippets.map((s) =>
                    s.id === row.id ? { ...s, tags: e.target.value } : s,
                  ),
                }))
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setDraft((prev) => ({
                  snippets: prev.snippets.filter((s) => s.id !== row.id),
                }))
              }
            >
              {t("remove")}
            </Button>
          </div>
        ))
      )}
      <Button type="button" variant="outline" onClick={clear}>
        {t("clearAll")}
      </Button>
    </div>
  );

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      form={form}
      preview={
        <div className="space-y-3 text-sm text-gray-700">
          <p className="font-semibold text-opseu-dark">{t("previewTitle")}</p>
          <p>{t("previewBody", { count: draft.snippets.length })}</p>
        </div>
      }
      footer={<ToolRelatedFooter toolSlug="ca-snippets" />}
    />
  );
}
