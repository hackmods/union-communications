/**
 * Live CSS document silhouettes for the Document Generator preview.
 */

"use client";

import type { OfficePresetId, BrandPalette } from "@/lib/constants/office-templates";
import { pickContrastingInk } from "@/lib/utils/ink";
import { cn } from "@/lib/utils";

type OfficePresetMockProps = {
  presetId: OfficePresetId;
  palette: BrandPalette;
  localLabel: string;
  fields: Record<string, string>;
  logoSrc?: string | null;
  includeDocx: boolean;
  includeXlsx: boolean;
  includePptx: boolean;
  className?: string;
};

function FormatChips({
  includeDocx,
  includeXlsx,
  includePptx,
}: {
  includeDocx: boolean;
  includeXlsx: boolean;
  includePptx: boolean;
}) {
  const chips = [
    includeDocx && "Word",
    includeXlsx && "Excel",
    includePptx && "PowerPoint",
  ].filter(Boolean) as string[];
  if (chips.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c}
          className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function OfficePresetMock({
  presetId,
  palette,
  localLabel,
  fields,
  logoSrc,
  includeDocx,
  includeXlsx,
  includePptx,
  className,
}: OfficePresetMockProps) {
  const ink = pickContrastingInk(palette.primary);

  if (presetId === "seniority-worksheet") {
    const columns = [
      "Member",
      "Seniority",
      "Class",
      "Position",
      "Target",
      "Elig?",
      "Notes",
    ];
    return (
      <div className={cn("space-y-3", className)}>
        <div
          className="overflow-hidden rounded-lg border border-gray-200 shadow-sm"
          style={{ backgroundColor: "#fff" }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: palette.primary, color: ink }}
          >
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt=""
                className="h-8 w-auto max-w-[96px] object-contain"
              />
            ) : null}
            <span className="text-sm font-semibold">{localLabel}</span>
          </div>
          <div className="space-y-2 p-4">
            <p
              className="text-lg font-bold"
              style={{ color: palette.secondary }}
            >
              Seniority worksheet
            </p>
            <p className="text-xs text-gray-600">
              {[fields.sessionDate, fields.chair, fields.caseId]
                .filter(Boolean)
                .join(" · ") || "Session · chair · Hub case ID"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[10px] text-gray-700">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th
                        key={c}
                        className="border border-gray-200 bg-gray-50 px-1 py-1 text-left font-semibold"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((c) => (
                        <td
                          key={c}
                          className="h-5 border border-gray-100 px-1"
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fields.committeeNotes ? (
              <p className="text-xs whitespace-pre-wrap text-gray-600">
                {fields.committeeNotes}
              </p>
            ) : null}
          </div>
        </div>
        <FormatChips
          includeDocx={includeDocx}
          includeXlsx={includeXlsx}
          includePptx={includePptx}
        />
      </div>
    );
  }

  if (presetId === "quick-event") {
    return (
      <div className={cn("space-y-3", className)}>
        <div
          className="overflow-hidden rounded-lg border border-gray-200 shadow-sm"
          style={{ backgroundColor: "#fff" }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: palette.primary, color: ink }}
          >
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt=""
                className="h-8 w-auto max-w-[96px] object-contain"
              />
            ) : null}
            <span className="text-sm font-semibold">{localLabel}</span>
          </div>
          <div className="space-y-3 p-5">
            <p
              className="text-2xl font-bold leading-tight"
              style={{ color: palette.secondary }}
            >
              {fields.title || "Event title"}
            </p>
            {fields.subtitle ? (
              <p className="text-base text-gray-700">{fields.subtitle}</p>
            ) : null}
            <div
              className="inline-block rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
              style={{ backgroundColor: palette.primary, color: ink }}
            >
              When
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {[fields.date, fields.time].filter(Boolean).join(" · ") || "—"}
            </p>
            <div
              className="inline-block rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
              style={{ backgroundColor: palette.primary, color: ink }}
            >
              Where
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {fields.location || "—"}
            </p>
            {fields.body ? (
              <p className="text-sm whitespace-pre-wrap text-gray-700">
                {fields.body}
              </p>
            ) : null}
          </div>
        </div>
        <FormatChips
          includeDocx={includeDocx}
          includeXlsx={includeXlsx}
          includePptx={includePptx}
        />
      </div>
    );
  }

  // simple-letter + letterhead
  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: palette.primary, color: ink }}
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="h-9 w-auto max-w-[110px] object-contain"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{localLabel}</p>
            {fields.contactName ? (
              <p className="truncate text-xs">{fields.contactName}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-3 p-5 text-sm text-gray-800">
          {presetId === "simple-letter" || presetId === "welcome-letter" ? (
            <>
              {fields.date ? (
                <p className="text-gray-600">{fields.date}</p>
              ) : null}
              <p>Dear {fields.memberName || "Member"},</p>
              {presetId === "welcome-letter" && fields.collection ? (
                <p className="italic text-gray-600">{fields.collection}</p>
              ) : null}
              <p className="whitespace-pre-wrap leading-relaxed">
                {fields.body || "…"}
              </p>
              {presetId === "welcome-letter" && fields.membershipUrl ? (
                <p className="text-sm">
                  <span className="font-semibold">Membership: </span>
                  <span className="break-all">{fields.membershipUrl}</span>
                </p>
              ) : null}
              <p className="pt-2">In solidarity,</p>
              <p className="font-semibold">
                {presetId === "welcome-letter"
                  ? fields.presidentName || "Local president"
                  : fields.stewardName || "Steward"}
              </p>
            </>
          ) : (
            <>
              <p
                className="text-lg font-bold"
                style={{ color: palette.secondary }}
              >
                Correspondence
              </p>
              {fields.body?.trim() ? (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {fields.body}
                </p>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="border-b border-gray-200 pb-3" />
                  <div className="border-b border-gray-200 pb-3" />
                  <div className="border-b border-gray-200 pb-3" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <FormatChips
        includeDocx={includeDocx}
        includeXlsx={includeXlsx}
        includePptx={includePptx}
      />
    </div>
  );
}

/** Compact picker tile with mini silhouette */
export function OfficeExampleTile({
  presetId,
  title,
  selected,
  palette,
  onSelect,
}: {
  presetId: OfficePresetId;
  title: string;
  selected: boolean;
  palette: BrandPalette;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-xl border text-left transition-colors",
        selected
          ? "border-opseu-blue ring-2 ring-opseu-blue/30"
          : "border-gray-200 hover:border-opseu-blue/40",
      )}
    >
      <div
        className="h-16 border-b border-black/5 px-3 py-2"
        style={{ backgroundColor: palette.primary }}
      >
        <div className="h-full rounded-sm bg-white/95 p-1.5 shadow-sm">
          {presetId === "quick-event" ? (
            <div className="space-y-1">
              <div
                className="h-1.5 w-2/3 rounded-sm"
                style={{ backgroundColor: palette.secondary }}
              />
              <div className="h-1 w-1/3 rounded-sm bg-gray-300" />
              <div className="h-1 w-1/2 rounded-sm bg-gray-200" />
            </div>
          ) : presetId === "seniority-worksheet" ? (
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-0.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-sm bg-gray-200"
                    style={
                      i < 4
                        ? { backgroundColor: palette.primary, opacity: 0.35 }
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div
                className="mb-1 h-2 w-full rounded-sm"
                style={{ backgroundColor: palette.primary, opacity: 0.35 }}
              />
              <div className="h-1 w-full rounded-sm bg-gray-200" />
              <div className="h-1 w-5/6 rounded-sm bg-gray-200" />
              <div className="h-1 w-4/6 rounded-sm bg-gray-200" />
            </div>
          )}
        </div>
      </div>
      <p className="px-3 py-2 text-sm font-semibold text-opseu-dark">{title}</p>
    </button>
  );
}
