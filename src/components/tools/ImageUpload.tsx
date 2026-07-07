"use client";

import { useRef, useState } from "react";
import { validateImageFile } from "@/lib/utils/validation";
import { fileToDataUrl } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

interface ImageUploadProps {
  onUpload: (dataUrl: string) => void;
  onClear?: () => void;
  preview?: string;
  label?: string;
}

export function ImageUpload({
  onUpload,
  onClear,
  preview,
  label,
}: ImageUploadProps) {
  const t = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = validateImageFile(file);
    if (!result.valid) {
      setError(result.error);
      return;
    }

    setError(null);
    const dataUrl = await fileToDataUrl(result.file);
    onUpload(dataUrl);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        onChange={handleChange}
        className="sr-only"
        id="image-upload"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          {t("upload")}
        </Button>
        {preview && onClear && (
          <Button type="button" variant="ghost" onClick={onClear}>
            {t("remove")}
          </Button>
        )}
      </div>
      {preview && (
        <img
          src={preview}
          alt=""
          className="max-h-32 rounded-lg border object-contain"
        />
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
