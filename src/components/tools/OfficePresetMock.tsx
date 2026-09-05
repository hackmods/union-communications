/**
 * Live CSS document silhouettes for the Document Generator preview.
 */

"use client";

import type { OfficePresetId, BrandPalette } from "@/lib/constants/office-templates";
import {
  officeMockPaddingPx,
  officeMockTypography,
  type CanvasTokens,
} from "@/lib/utils/canvas-tokens";
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
  /** Brand Kit canvas tokens — drives preview type scale */
  tokens?: CanvasTokens;
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

const FALLBACK_TYPE = {
  headerTitlePx: 14,
  docTitlePx: 24,
  bodyPx: 14,
  labelPx: 12,
} as const;

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
  tokens,
}: OfficePresetMockProps) {
  const ink = pickContrastingInk(palette.primary);
  const type = tokens ? officeMockTypography(tokens) : FALLBACK_TYPE;
  const bodyPadPx = officeMockPaddingPx(tokens);

  if (presetId === "grievance-intake") {
    const wRows = [
      ["Who", fields.who],
      ["What", fields.what],
      ["Where", fields.where],
      ["When", fields.when],
      ["Why", fields.why],
      ["Want", fields.want],
    ] as const;
    return (
      <div className={cn("min-w-0 space-y-3", className)}>
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
            <span
              className="font-semibold"
              style={{ fontSize: type.headerTitlePx }}
            >
              {localLabel}
            </span>
          </div>
          <div className="space-y-2" style={{ padding: bodyPadPx }}>
            <p
              className="font-bold"
              style={{ color: palette.secondary, fontSize: type.docTitlePx }}
            >
              Grievance intake
            </p>
            <p className="text-gray-600" style={{ fontSize: type.labelPx }}>
              {[fields.incidentDate, fields.caArticle]
                .filter(Boolean)
                .join(" · ") || "Date · CA article"}
            </p>
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse text-gray-700"
                style={{ fontSize: Math.max(9, type.labelPx - 2) }}
              >
                <tbody>
                  {wRows.map(([label, value]) => (
                    <tr key={label}>
                      <th className="w-16 border border-gray-200 bg-gray-50 px-1 py-1 text-left font-semibold">
                        {label}
                      </th>
                      <td className="h-6 border border-gray-100 px-1">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      <div className={cn("min-w-0 space-y-3", className)}>
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
            <span
              className="font-semibold"
              style={{ fontSize: type.headerTitlePx }}
            >
              {localLabel}
            </span>
          </div>
          <div className="space-y-2" style={{ padding: bodyPadPx }}>
            <p
              className="font-bold"
              style={{ color: palette.secondary, fontSize: type.docTitlePx }}
            >
              Seniority worksheet
            </p>
            <p className="text-gray-600" style={{ fontSize: type.labelPx }}>
              {[fields.sessionDate, fields.chair, fields.caseId]
                .filter(Boolean)
                .join(" · ") || "Session · chair · Hub case ID"}
            </p>
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse text-gray-700"
                style={{ fontSize: Math.max(9, type.labelPx - 2) }}
              >
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
              <p
                className="whitespace-pre-wrap text-gray-600"
                style={{ fontSize: type.labelPx }}
              >
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
      <div className={cn("min-w-0 space-y-3", className)}>
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
            <span
              className="font-semibold"
              style={{ fontSize: type.headerTitlePx }}
            >
              {localLabel}
            </span>
          </div>
          <div className="space-y-3" style={{ padding: bodyPadPx }}>
            <p
              className="font-bold leading-tight"
              style={{ color: palette.secondary, fontSize: type.docTitlePx }}
            >
              {fields.title || "Event title"}
            </p>
            {fields.subtitle ? (
              <p className="text-gray-700" style={{ fontSize: type.bodyPx }}>
                {fields.subtitle}
              </p>
            ) : null}
            <div
              className="inline-block rounded px-2 py-0.5 font-bold uppercase tracking-wide"
              style={{
                backgroundColor: palette.primary,
                color: ink,
                fontSize: type.labelPx,
              }}
            >
              When
            </div>
            <p
              className="font-semibold text-gray-900"
              style={{ fontSize: type.bodyPx }}
            >
              {[fields.date, fields.time].filter(Boolean).join(" · ") || "—"}
            </p>
            <div
              className="inline-block rounded px-2 py-0.5 font-bold uppercase tracking-wide"
              style={{
                backgroundColor: palette.primary,
                color: ink,
                fontSize: type.labelPx,
              }}
            >
              Where
            </div>
            <p
              className="font-semibold text-gray-900"
              style={{ fontSize: type.bodyPx }}
            >
              {fields.location || "—"}
            </p>
            {fields.body ? (
              <p
                className="whitespace-pre-wrap text-gray-700"
                style={{ fontSize: type.bodyPx }}
              >
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
    <div className={cn("min-w-0 space-y-3", className)}>
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
            <p
              className="truncate font-bold"
              style={{ fontSize: type.headerTitlePx }}
            >
              {localLabel}
            </p>
            {fields.contactName ? (
              <p className="truncate" style={{ fontSize: type.labelPx }}>
                {fields.contactName}
              </p>
            ) : null}
          </div>
        </div>
        <div
          className="space-y-3 text-gray-800"
          style={{ fontSize: type.bodyPx, padding: bodyPadPx }}
        >
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
                className="font-bold"
                style={{ color: palette.secondary, fontSize: type.docTitlePx }}
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

/** Compact picker tile — colour chip + title, sized for phone grids. */
export function OfficeExampleTile({
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
        "flex min-h-11 min-w-0 w-full flex-col overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
        selected
          ? "border-opseu-blue ring-2 ring-opseu-blue/30"
          : "border-gray-200 hover:border-opseu-blue/40",
      )}
    >
      <span
        className="block h-1.5 w-full"
        style={{ backgroundColor: palette.primary }}
        aria-hidden
      />
      <span className="px-2.5 py-2 text-sm font-semibold leading-snug text-opseu-dark">
        {title}
      </span>
    </button>
  );
}
