"use client";

import type { CSSProperties, RefObject } from "react";
import type { BrandKit } from "@/types/entities";
import type { PublicRosterPerson } from "@/types/public-roster";
import {
  ORG_CHART_FORMATS,
  isPortraitOrgChartFormat,
  type OrgChartFormatId,
  type OrgChartLayoutId,
} from "@/lib/constants/org-chart-formats";
import {
  directoryRowsFromPeople,
  groupOrgChartPeople,
  rosterHasNamedPeople,
  type OrgChartBand,
} from "@/lib/org-chart/layout";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
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
): CSSProperties {
  return {
    backgroundColor: plate,
    color: ink,
    borderRadius: 8,
    padding: compact ? "6px 8px" : "10px 12px",
    textAlign: "center",
    minWidth: compact ? 88 : 112,
    maxWidth: compact ? 140 : 180,
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
  const tokens = resolveCanvasTokens(brandKit);
  const surfaceStyle = canvasSurfaceStyle(tokens, {
    primary: brandKit.primaryColor,
    secondary: brandKit.secondaryColor,
    accent: brandKit.accentColor,
  });
  const ink = pickContrastingInk(brandKit.primaryColor);
  const plateInk = pickContrastingInk(brandKit.secondaryColor);
  const muted = mutedInkOnBackground(brandKit.primaryColor, 0.85);
  const bands = groupOrgChartPeople(people);
  const directoryRows = directoryRowsFromPeople(people, stewardsPositionLabel);
  const namedCount = people.filter(
    (person) => person.name.trim() || person.role.trim(),
  ).length;
  const compact =
    namedCount > 12 || (isPortraitOrgChartFormat(formatId) && namedCount > 8);
  const hasPeople = rosterHasNamedPeople(people);
  const localLabel = [
    brandKit.local.localNumber?.trim()
      ? `Local ${brandKit.local.localNumber.trim()}`
      : "",
    brandKit.local.subText?.trim() ?? "",
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="shadow-lg">
      <div
        ref={canvasRef}
        data-export-root=""
        className={cn("relative flex w-full flex-col", format.aspect)}
        style={{
          ...surfaceStyle,
          color: ink,
          padding: tokens.paddingPx,
          gap: Math.max(8, Math.round(tokens.gapPx * 0.75)),
          fontFamily: tokens.bodyFontFamily,
        }}
      >
        <CanvasGrainOverlay opacity={tokens.grainOpacity} />
        <CanvasBrandHeader
          backgroundColor={brandKit.primaryColor}
          localNumber={brandKit.local.localNumber}
          subText={brandKit.local.subText}
          logoSize="sm"
          fontFamily={tokens.bodyFontFamily}
        />
        <h2
          className="relative z-[2]"
          style={{
            color: ink,
            fontSize: compact
              ? Math.round(tokens.titleFontSizePx * 0.7)
              : tokens.titleFontSizePx,
            fontWeight: tokens.titleFontWeight,
            letterSpacing: tokens.titleLetterSpacing,
            textTransform: tokens.titleTextTransform,
            lineHeight: 1.15,
            margin: 0,
            fontFamily: tokens.headlineFontFamily,
          }}
        >
          {title}
        </h2>
        {layoutId === "directory" && localLabel ? (
          <p
            className="relative z-[2]"
            style={{
              color: muted,
              fontSize: Math.max(
                11,
                Math.round(tokens.subtitleFontSizePx * 0.9),
              ),
              margin: 0,
            }}
          >
            {localLabel}
          </p>
        ) : null}
        <div
          className="relative z-[2] flex min-h-0 flex-1 flex-col"
          style={{ gap: compact ? 8 : 12 }}
        >
          {!hasPeople ? (
            <p
              style={{
                color: muted,
                fontSize: tokens.subtitleFontSizePx,
                margin: 0,
              }}
            >
              {emptyLabel}
            </p>
          ) : layoutId === "directory" ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: compact ? 11 : 13,
                color: ink,
              }}
            >
              <thead>
                <tr>
                  {[
                    positionColumnLabel,
                    nameColumnLabel,
                    locationColumnLabel,
                  ].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: "left",
                        padding: compact ? "4px 6px" : "6px 8px",
                        borderBottom: `2px solid ${brandKit.secondaryColor}`,
                        fontFamily: tokens.headlineFontFamily,
                        fontSize: compact ? 10 : 11,
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
                        padding: compact ? "4px 6px" : "6px 8px",
                        borderBottom: `1px solid ${muted}`,
                        fontWeight: 600,
                        width: "34%",
                      }}
                    >
                      {row.position}
                    </td>
                    <td
                      style={{
                        padding: compact ? "4px 6px" : "6px 8px",
                        borderBottom: `1px solid ${muted}`,
                        width: "40%",
                      }}
                    >
                      {row.name}
                    </td>
                    <td
                      style={{
                        padding: compact ? "4px 6px" : "6px 8px",
                        borderBottom: `1px solid ${muted}`,
                        width: "26%",
                        opacity: 0.9,
                      }}
                    >
                      {row.location}
                    </td>
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
                          10,
                          Math.round(tokens.subtitleFontSizePx * 0.85),
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
                      gap: compact ? 6 : 8,
                    }}
                  >
                    {band.people.map((person) => (
                      <article
                        key={person.id}
                        style={cardStyle(
                          brandKit.secondaryColor,
                          plateInk,
                          compact && !lead,
                        )}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: lead ? 16 : compact ? 11 : 13,
                            lineHeight: 1.2,
                            fontFamily: tokens.headlineFontFamily,
                          }}
                        >
                          {person.name.trim() || person.role.trim()}
                        </p>
                        {person.role.trim() ? (
                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: lead ? 12 : compact ? 9 : 11,
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
                              fontSize: compact ? 8 : 10,
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
  );
}
