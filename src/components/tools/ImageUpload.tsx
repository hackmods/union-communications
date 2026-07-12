"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { validateImageFile } from "@/lib/utils/validation";
import { fileToDataUrl } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

interface ImageUploadProps {
  onUpload: (dataUrl: string) => void;
  onClear?: () => void;
  preview?: string;
  label?: string;
  hint?: string;
}

export function ImageUpload({
  onUpload,
  onClear,
  preview,
  label,
  hint,
}: ImageUploadProps) {
  const t = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = validateImageFile(file);
    if (!result.valid) {
      setError(result.error);
      e.target.value = "";
      return;
    }

    setError(null);
    const dataUrl = await fileToDataUrl(result.file);
    onUpload(dataUrl);
    // Allow re-selecting the same file after clear/replace
    e.target.value = "";
  };

  const openPicker = () => {
    inputRef.current?.click();
  };

  const hasPreview = Boolean(preview?.trim());

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        onChange={handleChange}
        className="sr-only"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={openPicker}>
          {t("upload")}
        </Button>
        {hasPreview && onClear && (
          <Button type="button" variant="ghost" onClick={onClear}>
            {t("remove")}
          </Button>
        )}
      </div>
      {hasPreview && (
        <div className="relative h-32 w-full max-w-xs">
          {preview!.endsWith(".svg") ||
          preview!.startsWith("data:image/svg") ? (
            // eslint-disable-next-line @next/next/no-img-element -- SVG previews
            <img
              src={preview!}
              alt=""
              className="h-32 w-full rounded-lg border object-contain"
            />
          ) : (
            <Image
              src={preview!}
              alt=""
              fill
              unoptimized
              className="rounded-lg border object-contain"
            />
          )}
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
