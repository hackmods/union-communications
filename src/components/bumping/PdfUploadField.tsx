"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { extractTextFromFile } from "@/lib/bumping/pdf-extract";
import type { PositionDescription } from "@/types/bumping";

interface PdfUploadFieldProps {
  label: string;
  position: PositionDescription;
  onChange: (position: PositionDescription) => void;
}

export function PdfUploadField({
  label,
  position,
  onChange,
}: PdfUploadFieldProps) {
  const t = useTranslations("bumping");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setError(null);
    try {
      const text = await extractTextFromFile(file);
      onChange({
        ...position,
        sourceText: text,
        fileName: file.name,
      });
    } catch {
      setError(t("pdfError"));
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <div className="mt-2 space-y-2">
        <input
          type="file"
          accept=".pdf,.txt"
          onChange={handleFile}
          className="text-sm"
          aria-label={t("uploadPdf")}
        />
        {extracting && (
          <p className="text-xs text-gray-500">{t("extractingPdf")}</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        {position.fileName && (
          <p className="text-xs text-gray-500">
            {t("loadedFile", { name: position.fileName })}
          </p>
        )}
        <textarea
          value={position.sourceText ?? ""}
          onChange={(e) =>
            onChange({ ...position, sourceText: e.target.value })
          }
          placeholder={t("pastePositionText")}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
