"use client";

import type { ReactNode } from "react";
import type { BoardSheetFormat } from "@/lib/constants/board-banner-formats";
import {
  PACK_GAP_INCHES,
  bannersPerSheet,
  cornersPerSheet,
  sideColumnsPerSheet,
  usableSheetSize,
} from "@/lib/constants/board-banner-formats";
import type { TrimPieceId } from "@/lib/constants/board-banner-layouts";

const CUT = "#9CA3AF";

export interface BoardBannerSheetProps {
  sheet: BoardSheetFormat;
  mode: "banner" | "trim";
  trimPiece: TrimPieceId;
  stripHeightInches: number;
  edgeWidthInches: number;
  /** Render one piece (strip / column / corner) */
  renderPiece: () => ReactNode;
  className?: string;
}

function CutRule({ horizontal }: { horizontal: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        flexShrink: 0,
        width: horizontal ? "100%" : undefined,
        height: horizontal ? undefined : "100%",
        borderTop: horizontal ? `1px dashed ${CUT}` : undefined,
        borderLeft: !horizontal ? `1px dashed ${CUT}` : undefined,
        boxSizing: "border-box",
      }}
    />
  );
}

/**
 * Portrait pack sheet: N copies of the active piece with printed cut marks.
 * Parent supplies aspect via sheet.aspect; export captures this whole node.
 */
export function BoardBannerSheet({
  sheet,
  mode,
  trimPiece,
  stripHeightInches,
  edgeWidthInches,
  renderPiece,
  className,
}: BoardBannerSheetProps) {
  const usable = usableSheetSize(sheet);
  // Percent of full sheet (including margins) so CSS % matches PDF inches
  const marginPctX = (sheet.marginInches / sheet.widthInches) * 100;
  const marginPctY = (sheet.marginInches / sheet.heightInches) * 100;
  const usableWPct = 100 - marginPctX * 2;
  const usableHPct = 100 - marginPctY * 2;

  const isBannerStack = mode === "banner" || trimPiece === "bottom";
  const isSide = mode === "trim" && trimPiece === "side";
  const isCorner = mode === "trim" && trimPiece === "corner";

  let body: ReactNode;

  if (isBannerStack) {
    const count = bannersPerSheet(
      sheet.heightInches,
      stripHeightInches,
      PACK_GAP_INCHES,
      sheet.marginInches,
    );
    const stripHPct =
      (stripHeightInches / usable.heightInches) * usableHPct;
    const gapPct = (PACK_GAP_INCHES / sheet.heightInches) * 100;

    const rows: ReactNode[] = [];
    for (let i = 0; i < count; i++) {
      if (i > 0) {
        rows.push(
          <div
            key={`gap-${i}`}
            style={{ height: `${gapPct}%`, width: "100%", flexShrink: 0 }}
          >
            <CutRule horizontal />
          </div>,
        );
      }
      rows.push(
        <div
          key={`strip-${i}`}
          style={{
            width: "100%",
            height: `${stripHPct}%`,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {renderPiece()}
        </div>,
      );
    }

    body = (
      <div
        style={{
          width: `${usableWPct}%`,
          height: `${usableHPct}%`,
          margin: `${marginPctY}% ${marginPctX}%`,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {rows}
      </div>
    );
  } else if (isSide) {
    const cols = sideColumnsPerSheet(
      sheet.widthInches,
      edgeWidthInches,
      PACK_GAP_INCHES,
      sheet.marginInches,
    );
    const colWPct = (edgeWidthInches / usable.widthInches) * usableWPct;
    const gapPct = (PACK_GAP_INCHES / sheet.widthInches) * 100;

    const columns: ReactNode[] = [];
    for (let i = 0; i < cols; i++) {
      if (i > 0) {
        columns.push(
          <div
            key={`gap-${i}`}
            style={{
              width: `${gapPct}%`,
              height: "100%",
              flexShrink: 0,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <CutRule horizontal={false} />
          </div>,
        );
      }
      columns.push(
        <div
          key={`col-${i}`}
          style={{
            width: `${colWPct}%`,
            height: "100%",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {renderPiece()}
        </div>,
      );
    }

    body = (
      <div
        style={{
          width: `${usableWPct}%`,
          height: `${usableHPct}%`,
          margin: `${marginPctY}% ${marginPctX}%`,
          display: "flex",
          flexDirection: "row",
          boxSizing: "border-box",
        }}
      >
        {columns}
      </div>
    );
  } else if (isCorner) {
    const grid = cornersPerSheet(
      sheet.widthInches,
      sheet.heightInches,
      edgeWidthInches,
      PACK_GAP_INCHES,
      sheet.marginInches,
    );
    const tileWPct = (edgeWidthInches / usable.widthInches) * usableWPct;
    const tileHPct = (edgeWidthInches / usable.heightInches) * usableHPct;
    const gapXPct = (PACK_GAP_INCHES / sheet.widthInches) * 100;
    const gapYPct = (PACK_GAP_INCHES / sheet.heightInches) * 100;

    const rowNodes: ReactNode[] = [];
    for (let r = 0; r < grid.rows; r++) {
      if (r > 0) {
        rowNodes.push(
          <div
            key={`rgap-${r}`}
            style={{ height: `${gapYPct}%`, width: "100%", flexShrink: 0 }}
          >
            <CutRule horizontal />
          </div>,
        );
      }
      const cells: ReactNode[] = [];
      for (let c = 0; c < grid.cols; c++) {
        if (c > 0) {
          cells.push(
            <div
              key={`cgap-${r}-${c}`}
              style={{
                width: `${gapXPct}%`,
                height: "100%",
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <CutRule horizontal={false} />
            </div>,
          );
        }
        cells.push(
          <div
            key={`tile-${r}-${c}`}
            style={{
              width: `${tileWPct}%`,
              height: "100%",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {renderPiece()}
          </div>,
        );
      }
      rowNodes.push(
        <div
          key={`row-${r}`}
          style={{
            height: `${tileHPct}%`,
            width: "100%",
            flexShrink: 0,
            display: "flex",
            flexDirection: "row",
          }}
        >
          {cells}
        </div>,
      );
    }

    body = (
      <div
        style={{
          width: `${usableWPct}%`,
          height: `${usableHPct}%`,
          margin: `${marginPctY}% ${marginPctX}%`,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {rowNodes}
      </div>
    );
  } else {
    body = null;
  }

  return (
    <div
      className={className}
      style={{
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        backgroundColor: "#FFFFFF",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {body}
    </div>
  );
}
