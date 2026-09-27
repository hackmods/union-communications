"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import type { BrandKit, DesignTreatment } from "@/types/entities";
import type { PublicRosterPerson } from "@/types/public-roster";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import {
  ORG_CHART_FORMATS,
  isOrgChartListLayout,
  orgChartPreviewHeightPx,
  orgChartLayoutShowsLocation,
  type OrgChartFormatId,
  type OrgChartLayoutId,
} from "@/lib/constants/org-chart-formats";
import {
  directoryRowsFromPeople,
  groupOrgChartPeople,
  rosterHasNamedPeople,
  type OrgChartBand,
} from "@/lib/org-chart/layout";
import {
  orgChartChromeScale,
  orgChartContentLoad,
  orgChartHeaderLogoScale,
  orgChartUsesCompactChrome,
} from "@/lib/org-chart/fit";
import { estimateTypeFitScale } from "@/lib/utils/canvas-type-fit";
import { CanvasWrapper } from "@/components/canvas-core";
import {
  PRINT_PAGE_LEGACY_REFERENCE_PX,
  printBrandHeaderChrome,
} from "@/lib/comms/print-page-formats";
import { printPageScaledTokens } from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
import { mutedInkOnBackground, pickContrastingInk } from "@/lib/utils/ink";
import { resolveTreatmentSurface } from "@/lib/brand/design-treatment-surface";
import { cn } from "@/lib/utils";
import {
  CanvasBrandHeader,
  CanvasGrainOverlay,
} from "@/components/tools/canvas";

export type OrgChartSheetBackground = "brand" | "white";

type OrgChartCanvasProps = {
  canvasRef: RefObject<HTMLDivElement | null>;
  brandKit: BrandKit;
  treatment: DesignTreatment;
  /** Theme-agnostic sheet fill — `white` ignores Brand Kit field colour. */
  sheetBackground: OrgChartSheetBackground;
  tokens: CanvasTokens;
  logoMode: BoardLogoMode;
  showLocalNumber: boolean;
  people: PublicRosterPerson[];
  formatId: OrgChartFormatId;
  layoutId: OrgChartLayoutId;
  title: string;
  executiveLabel: string;
  stewardsLabel: string;
  committeeLabel: string;
  emptyLabel: string;
  positionColumnLabel: string;
  nameColumnLabel: string;
  locationColumnLabel: string;
  stewardsPositionLabel: string;
};

function bandHeading(
  band: OrgChartBand,
  labels: {
    executiveLabel: string;
    stewardsLabel: string;
    committeeLabel: string;
  },
): string | undefined {
  if (band.kind === "executive-lead") return undefined;
  if (band.kind === "executive") return labels.executiveLabel;
  if (band.kind === "stewards") {
    return band.title
      ? `${labels.stewardsLabel} — ${band.title}`
      : labels.stewardsLabel;
  }
  return band.title
    ? `${labels.committeeLabel} — ${band.title}`
    : labels.committeeLabel;
}

function cardStyle(
  plate: string,
  ink: string,
  compact: boolean,
  typeRatio: number,
  borderColor?: string,
): CSSProperties {
  const padY = compact ? 6 : 10;
  const padX = compact ? 8 : 12;
  return {
    backgroundColor: plate,
    color: ink,
    borderRadius: 8,
    border: borderColor ? `1px solid ${borderColor}` : undefined,
    padding: `${Math.round(padY * typeRatio)}px ${Math.round(padX * typeRatio)}px`,
    textAlign: "center",
    minWidth: Math.round((compact ? 88 : 112) * typeRatio),
    maxWidth: Math.round((compact ? 140 : 180) * typeRatio),
    boxSizing: "border-box",
  };
}

/** Export / canvas sheet fill after treatment + optional white override. */
export function resolveOrgChartSheetFill(opts: {
  treatment: DesignTreatment;
  sheetBackground: OrgChartSheetBackground;
  primary: string;
  secondary: string;
  accent: string;
}): { outerFill: string; textInk: string; headerFill: string; brand: string } {
  const treated = resolveTreatmentSurface(
    opts.treatment,
    {
      primary: opts.primary,
      secondary: opts.secondary,
      accent: opts.accent,
    },
    "print",
  );
  if (opts.sheetBackground === "white") {
    return {
      outerFill: "#FFFFFF",
      textInk: "#1A1A1A",
      headerFill: treated.brand,
      brand: treated.brand,
    };
  }
  return {
    outerFill: treated.outerFill,
    textInk: treated.textInk,
    headerFill: treated.brand,
    brand: treated.brand,
  };
}

export function OrgChartCanvas({
  canvasRef,
  brandKit,
  treatment,
  sheetBackground,
  tokens,
  logoMode,
  showLocalNumber,
  people,
  formatId,
  layoutId,
  title,
  executiveLabel,
  stewardsLabel,
  committeeLabel,
  emptyLabel,
  positionColumnLabel,
  nameColumnLabel,
  locationColumnLabel,
  stewardsPositionLabel,
}: OrgChartCanvasProps) {
  const format = ORG_CHART_FORMATS[formatId];
  const referenceWidthPx = PRINT_PAGE_LEGACY_REFERENCE_PX;
  const designWidthPx = format.previewWidthPx;
  const designHeightPx = orgChartPreviewHeightPx(format);
  const scaledTokens = printPageScaledTokens(
    tokens,
    designWidthPx,
    referenceWidthPx,
  );
  const listLayout = isOrgChartListLayout(layoutId);
  const namedCount = people.filter(
    (person) => person.name.trim() || person.role.trim(),
  ).length;
  const bands = groupOrgChartPeople(people);
  const load = orgChartContentLoad({
    namedCount,
    bandCount: bands.length,
    listLayout,
  });
  const typeRatio = orgChartChromeScale({
    designWidthPx,
    namedCount,
    bandCount: bands.length,
    listLayout,
  });
  const compact = orgChartUsesCompactChrome(load);
  const headerChrome = printBrandHeaderChrome(designWidthPx);
  const logoMaxHeightPx = Math.round(
    headerChrome.logoMaxHeightPx * orgChartHeaderLogoScale(load),
  );
  const sheet = resolveOrgChartSheetFill({
    treatment,
    sheetBackground,
    primary: brandKit.primaryColor,
    secondary: brandKit.secondaryColor,
    accent: brandKit.accentColor,
  });
  const treated = resolveTreatmentSurface(
    treatment,
    {
      primary: brandKit.primaryColor,
      secondary: brandKit.secondaryColor,
      accent: brandKit.accentColor,
    },
    "print",
  );
  const surfaceStyle = canvasSurfaceStyle(scaledTokens, {
    primary: sheet.outerFill,
    secondary:
      sheetBackground === "white" ? "#FFFFFF" : treated.secondary,
    accent: treated.accent,
  });
  const ink = sheet.textInk;
  const whiteSheet = sheetBackground === "white";
  const plateFill = whiteSheet
    ? treatment === "full"
      ? brandKit.secondaryColor
      : "#FFFFFF"
    : treatment === "full"
      ? brandKit.secondaryColor
      : treated.contentFill;
  const plateInk = pickContrastingInk(plateFill);
  const plateBorder =
    whiteSheet && treatment !== "full" ? sheet.brand : undefined;
  const muted = mutedInkOnBackground(sheet.outerFill, 0.85);
  const headerFill = sheet.headerFill;
  const directoryRows = directoryRowsFromPeople(people, stewardsPositionLabel);
  const showLocation = orgChartLayoutShowsLocation(layoutId);
  const hasPeople = rosterHasNamedPeople(people);
  const localLabel = [
    brandKit.local.localNumber?.trim()
      ? `Local ${brandKit.local.localNumber.trim()}`
      : "",
    brandKit.local.subText?.trim() ?? "",
  ]
    .filter(Boolean)
    .join(" — ");
  const columnLabels = showLocation
    ? [positionColumnLabel, nameColumnLabel, locationColumnLabel]
    : [positionColumnLabel, nameColumnLabel];

  const listBodyFontPx = Math.max(9, Math.round((compact ? 11 : 13) * typeRatio));
  const listHeadFontPx = Math.max(8, Math.round((compact ? 10 : 11) * typeRatio));
  const cellPad = compact
    ? `${Math.round(4 * typeRatio)}px ${Math.round(6 * typeRatio)}px`
    : `${Math.round(6 * typeRatio)}px ${Math.round(8 * typeRatio)}px`;

  const slotRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  useLayoutEffect(() => {
    const stack = stackRef.current;
    const slot = slotRef.current;
    if (!stack || !slot || !hasPeople) {
      setFitScale(1);
      return;
    }

    const measure = () => {
      const prevTransform = stack.style.transform;
      const prevWidth = stack.style.width;
      stack.style.transform = "none";
      stack.style.width = "100%";
      const next = estimateTypeFitScale(stack.scrollHeight, slot.clientHeight);
      stack.style.transform = prevTransform;
      stack.style.width = prevWidth;
      setFitScale((prev) => (Math.abs(prev - next) < 0.015 ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(slot);
    return () => ro.disconnect();
  }, [
    hasPeople,
    namedCount,
    bands.length,
    listLayout,
    typeRatio,
    compact,
    title,
    formatId,
    layoutId,
    designHeightPx,
  ]);

  return (
    <div className="shadow-lg">
      <CanvasWrapper
        designWidth={designWidthPx}
        designHeight={designHeightPx}
        mode="fixed"
        maxScale={2}
        align="center"
      >
      <div
        ref={canvasRef}
        data-export-root=""
        className={cn("relative flex shrink-0 flex-col", format.aspect)}
        style={{
          ...surfaceStyle,
          width: designWidthPx,
          height: designHeightPx,
          flexShrink: 0,
          color: ink,
          padding: scaledTokens.paddingPx,
          gap: Math.max(8, Math.round(scaledTokens.gapPx * 0.75)),
          fontFamily: scaledTokens.bodyFontFamily,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <CanvasGrainOverlay opacity={scaledTokens.grainOpacity} />
        <CanvasBrandHeader
          backgroundColor={headerFill}
          localNumber={brandKit.local.localNumber}
          subText={brandKit.local.subText}
          logoSize="sm"
          logoMode={logoMode}
          showLocalLabel={showLocalNumber}
          fontFamily={scaledTokens.bodyFontFamily}
          labelFontSizePx={headerChrome.labelPx}
          logoMaxHeightPx={logoMaxHeightPx}
        />
        <h2
          className="relative z-[2] shrink-0"
          style={{
            color: ink,
            fontSize: compact
              ? Math.round(scaledTokens.titleFontSizePx * 0.7)
              : scaledTokens.titleFontSizePx,
            fontWeight: scaledTokens.titleFontWeight,
            letterSpacing: scaledTokens.titleLetterSpacing,
            textTransform: scaledTokens.titleTextTransform,
            lineHeight: 1.15,
            margin: 0,
            fontFamily: scaledTokens.headlineFontFamily,
          }}
        >
          {title}
        </h2>
        {listLayout && localLabel ? (
          <p
            className="relative z-[2]"
            style={{
              color: muted,
              fontSize: Math.max(
                10,
                Math.round(scaledTokens.subtitleFontSizePx * 0.9),
              ),
              margin: 0,
            }}
          >
            {localLabel}
          </p>
        ) : null}
        <div
          ref={slotRef}
          className="relative z-[2] min-h-0 flex-1 overflow-hidden"
        >
          <div
            ref={stackRef}
            className="flex flex-col"
            style={{
              gap: compact ? 8 : 12,
              transform:
                hasPeople && fitScale < 1 ? `scale(${fitScale})` : undefined,
              transformOrigin: "top center",
              width:
                hasPeople && fitScale < 1 ? `${100 / fitScale}%` : "100%",
            }}
          >
          {!hasPeople ? (
            <p
              style={{
                color: muted,
                fontSize: scaledTokens.subtitleFontSizePx,
                margin: 0,
              }}
            >
              {emptyLabel}
            </p>
          ) : listLayout ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: listBodyFontPx,
                color: ink,
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr>
                  {columnLabels.map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: "left",
                        padding: cellPad,
                        borderBottom: `2px solid ${sheet.brand}`,
                        fontFamily: scaledTokens.headlineFontFamily,
                        fontSize: listHeadFontPx,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: muted,
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {directoryRows.map((row) => (
                  <tr key={row.personId}>
                    <td
                      style={{
                        padding: cellPad,
                        borderBottom: `1px solid ${muted}`,
                        fontWeight: 600,
                        width: showLocation ? "34%" : "42%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.position}
                    </td>
                    <td
                      style={{
                        padding: cellPad,
                        borderBottom: `1px solid ${muted}`,
                        width: showLocation ? "40%" : "58%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.name}
                    </td>
                    {showLocation ? (
                      <td
                        style={{
                          padding: cellPad,
                          borderBottom: `1px solid ${muted}`,
                          width: "26%",
                          opacity: 0.9,
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: "0.04em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {row.location}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            bands.map((band, index) => {
              const heading = bandHeading(band, {
                executiveLabel,
                stewardsLabel,
                committeeLabel,
              });
              const lead = band.kind === "executive-lead";
              return (
                <section
                  key={`${band.kind}-${band.title ?? index}`}
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {heading ? (
                    <p
                      style={{
                        color: muted,
                        fontSize: Math.max(
                          9,
                          Math.round(scaledTokens.subtitleFontSizePx * 0.85),
                        ),
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      {heading}
                    </p>
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: lead ? "center" : "flex-start",
                      gap: Math.round((compact ? 6 : 8) * typeRatio),
                    }}
                  >
                    {band.people.map((person) => (
                      <article
                        key={person.id}
                        style={cardStyle(
                          plateFill,
                          plateInk,
                          compact && !lead,
                          typeRatio,
                          plateBorder,
                        )}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: Math.round(
                              (lead ? 16 : compact ? 11 : 13) * typeRatio,
                            ),
                            lineHeight: 1.2,
                            fontFamily: scaledTokens.headlineFontFamily,
                          }}
                        >
                          {person.name.trim() || person.role.trim()}
                        </p>
                        {person.role.trim() ? (
                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: Math.round(
                                (lead ? 12 : compact ? 9 : 11) * typeRatio,
                              ),
                              lineHeight: 1.2,
                              opacity: 0.9,
                            }}
                          >
                            {person.role.trim()}
                          </p>
                        ) : null}
                        {person.location.trim() && band.kind !== "stewards" ? (
                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: Math.round((compact ? 8 : 10) * typeRatio),
                              opacity: 0.75,
                            }}
                          >
                            {person.location.trim()}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              );
            })
          )}
          </div>
        </div>
      </div>
      </CanvasWrapper>
    </div>
  );
}
