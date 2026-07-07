"use client";

import { useRef, useState } from "react";
import { useBrandStore } from "@/store/brand-store";
import { exportNodeAsBlob, downloadZip } from "@/lib/export/image-export";
import { PLATFORM_FORMATS } from "@/lib/constants/brand";
import { formatFilename } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { useTranslations } from "next-intl";

export default function ResizerPage() {
  const t = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [overlayText, setOverlayText] = useState("");
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [exporting, setExporting] = useState(false);
  const previewRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleExportZip = async () => {
    if (!imageUrl) return;
    setExporting(true);
    try {
      const files: { name: string; blob: Blob }[] = [];

      for (const [key, format] of Object.entries(PLATFORM_FORMATS)) {
        const node = previewRefs.current[key];
        if (!node) continue;
        const blob = await exportNodeAsBlob(node, { pixelRatio: 1 });
        files.push({
          name: `${key}-${format.width}x${format.height}.png`,
          blob,
        });
      }

      await downloadZip(
        files,
        formatFilename("social-assets", brandKit.local.localNumber, "zip"),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">Omnichannel Resizer</h1>
      <p className="mt-2 text-gray-600">
        Upload one image and download all platform formats in a ZIP.
      </p>

      <Card className="mt-8 space-y-4">
        <ImageUpload
          preview={imageUrl}
          onUpload={setImageUrl}
          onClear={() => setImageUrl(undefined)}
        />
        <Input
          label="Optional overlay text"
          value={overlayText}
          onChange={(e) => setOverlayText(e.target.value)}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSafeZones}
            onChange={(e) => setShowSafeZones(e.target.checked)}
          />
          Show safe-zone overlays
        </label>
        <Button onClick={handleExportZip} disabled={!imageUrl || exporting}>
          {exporting ? t("loading") : t("downloadZip")}
        </Button>
      </Card>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {Object.entries(PLATFORM_FORMATS).map(([key, format]) => (
          <div key={key}>
            <p className="mb-2 text-sm font-medium">
              {format.label} ({format.width}×{format.height})
            </p>
            <div
              ref={(el) => {
                previewRefs.current[key] = el;
              }}
              className="relative w-full overflow-hidden rounded-lg border bg-gray-100"
              style={{ aspectRatio: `${format.width}/${format.height}` }}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {overlayText && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-center text-xs text-white">
                  {overlayText}
                </div>
              )}
              {showSafeZones && (
                <div
                  className="pointer-events-none absolute inset-[10%] border-2 border-dashed border-yellow-400/80"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
