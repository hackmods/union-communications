"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import type { BrandKit } from "@/types/entities";
import type { PublicRosterPerson } from "@/types/public-roster";
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
import { printPageScaledTokens, resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
import { mutedInkOnBackground, pickContrastingInk } from "@/lib/utils/ink";
import { cn } from "@/lib/utils";
import {
  CanvasBrandHeader,
  CanvasGrainOverlay,
} from "@/components/tools/canvas";

type OrgChartCanvasProps = {
  canvasRef: RefObject<HTMLDivElement | null>;
  brandKit: BrandKit;
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
): CSSProperties {
  const padY = compact ? 6 : 10;
  const padX = compact ? 8 : 12;
  return {
    backgroundColor: plate,
    color: ink,
    borderRadius: 8,
    padding: `${Math.round(padY * typeRatio)}px ${Math.round(padX * typeRatio)}px`,
    textAlign: "center",
    minWidth: Math.round((compact ? 88 : 112) * typeRatio),
    maxWidth: Math.round((compact ? 140 : 180) * typeRatio),
    boxSizing: "border-box",
  };
}

export function OrgChartCanvas({
  canvasRef,
  brandKit,
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
  const tokens = resolveCanvasTokens(brandKit);
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
  const surfaceStyle = canvasSurfaceStyle(scaledTokens, {
    primary: brandKit.primaryColor,
    secondary: brandKit.secondaryColor,
    accent: brandKit.accentColor,
  });
  const ink = pickContrastingInk(brandKit.primaryColor);
  const plateInk = pickContrastingInk(brandKit.secondaryColor);
  const muted = mutedInkOnBackground(brandKit.primaryColor, 0.85);
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
          backgroundColor={brandKit.primaryColor}
          localNumber={brandKit.local.localNumber}
          subText={brandKit.local.subText}
          logoSize="sm"
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
                        borderBottom: `2px solid ${brandKit.secondaryColor}`,
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
                          brandKit.secondaryColor,
                          plateInk,
                          compact && !lead,
                          typeRatio,
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
