"use client";

import type { CSSProperties, Ref } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  QR_BOARD_FORMATS,
  qrBoardGridColumns,
  type QrBoardFormatId,
} from "@/lib/constants/qr-board-formats";
import { inkWithAlpha, pickContrastingInk } from "@/lib/utils/ink";

export interface QrBoardCanvasSlot {
  id: string;
  title: string;
  destination: string;
  qrSrc: string | null;
}

export interface QrBoardCanvasProps {
  canvasRef: Ref<HTMLDivElement>;
  formatId: QrBoardFormatId;
  posterTitle: string;
  posterSubtitle: string;
  slots: QrBoardCanvasSlot[];
  showUrl: boolean;
  includeBranding: boolean;
  primaryColor: string;
  secondaryColor: string;
  localLabel: string;
  qrPlaceholder: string;
}

export function QrBoardCanvas({
  canvasRef,
  formatId,
  posterTitle,
  posterSubtitle,
  slots,
  showUrl,
  includeBranding,
  primaryColor,
  secondaryColor,
  localLabel,
  qrPlaceholder,
}: QrBoardCanvasProps) {
  const format = QR_BOARD_FORMATS[formatId];
  const ink = pickContrastingInk(primaryColor);
  const muted = inkWithAlpha(ink, 0.85);
  const columns = qrBoardGridColumns(slots.length);
  const isTabloid = formatId === "tabloid";
  const isDense = slots.length >= 6;

  const titleSize = isTabloid
    ? isDense
      ? "text-3xl"
      : "text-4xl"
    : isDense
      ? "text-xl"
      : "text-2xl";

  const cellTitleSize = isTabloid
    ? isDense
      ? "text-base"
      : "text-lg"
    : isDense
      ? "text-xs"
      : "text-sm";

  const style: CSSProperties = {
    aspectRatio: `${format.widthInches} / ${format.heightInches}`,
    backgroundColor: primaryColor,
    color: ink,
    width: format.previewWidthPx,
    maxWidth: "100%",
  };

  return (
    <div
      ref={canvasRef}
      className="flex h-full flex-col overflow-hidden"
      style={style}
    >
      <div
        style={{
          height: isTabloid ? 10 : 8,
          backgroundColor: secondaryColor,
          flexShrink: 0,
        }}
      />

      <div
        className="flex flex-1 flex-col"
        style={{
          padding: isTabloid ? "28px 32px 24px" : "20px 22px 16px",
          minHeight: 0,
        }}
      >
        <header
          className="flex shrink-0 flex-col items-center text-center"
          style={{ marginBottom: isTabloid ? 20 : 14 }}
        >
          {includeBranding ? (
            <div style={{ marginBottom: isTabloid ? 12 : 8 }}>
              <BrandLogo
                size={isTabloid ? "md" : "sm"}
                backgroundColor={primaryColor}
              />
            </div>
          ) : null}
          <h2
            className={`font-bold leading-tight tracking-tight ${titleSize}`}
            style={{ color: ink, margin: 0 }}
          >
            {posterTitle || "\u00a0"}
          </h2>
          {posterSubtitle.trim() ? (
            <p
              className={isTabloid ? "text-base" : "text-sm"}
              style={{
                color: muted,
                margin: isTabloid ? "8px 0 0" : "6px 0 0",
                maxWidth: "36em",
              }}
            >
              {posterSubtitle}
            </p>
          ) : null}
        </header>

        <div
          className="grid min-h-0 flex-1 content-center"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: isTabloid ? (isDense ? 16 : 22) : isDense ? 10 : 14,
          }}
        >
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex min-h-0 flex-col items-center text-center"
              style={{ gap: isTabloid ? 8 : 6 }}
            >
              <p
                className={`font-semibold leading-snug ${cellTitleSize}`}
                style={{
                  color: ink,
                  margin: 0,
                  width: "100%",
                  wordBreak: "break-word",
                }}
              >
                {slot.title.trim() || "\u00a0"}
              </p>
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  padding: isTabloid ? 10 : 7,
                  width: "72%",
                  maxWidth: isTabloid ? 180 : 140,
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {slot.qrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
                  <img
                    src={slot.qrSrc}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: "#6B7280",
                      fontSize: isTabloid ? 12 : 10,
                      padding: 4,
                    }}
                  >
                    {qrPlaceholder}
                  </span>
                )}
              </div>
              {showUrl && slot.destination.trim() ? (
                <p
                  style={{
                    color: muted,
                    margin: 0,
                    fontSize: isTabloid ? (isDense ? 10 : 11) : isDense ? 8 : 9,
                    lineHeight: 1.25,
                    width: "100%",
                    wordBreak: "break-all",
                    overflowWrap: "anywhere",
                  }}
                >
                  {slot.destination.trim()}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        {includeBranding ? (
          <p
            className="shrink-0 text-center font-medium"
            style={{
              color: muted,
              margin: isTabloid ? "16px 0 0" : "12px 0 0",
              fontSize: isTabloid ? 14 : 11,
            }}
          >
            {localLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
