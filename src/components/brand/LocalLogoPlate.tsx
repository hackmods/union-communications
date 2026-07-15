"use client";

import { forwardRef } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { resolveLocalNumber, cn } from "@/lib/utils";
import { pickContrastingInk } from "@/lib/utils/ink";
import { meetsWcagAA } from "@/lib/utils/contrast";

export type LogoShape = "circle" | "square" | "rectangle";

export interface LocalLogoPlateProps {
  shape: LogoShape;
  primaryColor: string;
  secondaryColor: string;
  localNumber: string;
  subText: string;
  /**
   * `fixed` — Logo Builder canvas sizes (320² / ~448×176).
   * `fluid` — fills the parent; use inside a sized frame for social crop.
   */
  size?: "fixed" | "fluid";
  className?: string;
}

/**
 * Coloured local-logo plate shared by Logo Builder and Omnichannel Resizer.
 * Export-safe: colours are inline hex only (no Tailwind colour utilities).
 */
export const LocalLogoPlate = forwardRef<HTMLDivElement, LocalLogoPlateProps>(
  function LocalLogoPlate(
    {
      shape,
      primaryColor,
      secondaryColor,
      localNumber,
      subText,
      size = "fixed",
      className,
    },
    ref,
  ) {
    const isRectangle = shape === "rectangle";
    const localLabel = `Local ${resolveLocalNumber(localNumber)}`;
    const canvasInk = pickContrastingInk(primaryColor);
    const localColor = meetsWcagAA(secondaryColor, primaryColor, true)
      ? secondaryColor
      : canvasInk;

    const shell =
      size === "fixed"
        ? cn(
            "flex items-center justify-center overflow-hidden",
            shape === "circle" && "h-80 w-80 flex-col rounded-full",
            shape === "square" && "h-80 w-80 flex-col",
            shape === "rectangle" &&
              "h-44 w-[28rem] max-w-full flex-row gap-5 px-8",
          )
        : cn(
            "flex max-h-full max-w-full items-center justify-center overflow-hidden",
            shape === "circle" &&
              "aspect-square h-full w-auto flex-col rounded-full p-[8%]",
            shape === "square" &&
              "aspect-square h-full w-auto flex-col p-[8%]",
            shape === "rectangle" &&
              "aspect-[28/11] h-auto w-full max-h-full flex-row gap-[4%] px-[6%]",
          );

    const titleClass =
      size === "fixed"
        ? isRectangle
          ? "text-2xl leading-tight"
          : "text-4xl"
        : isRectangle
          ? "text-[clamp(0.75rem,4cqw,1.5rem)] leading-tight"
          : "text-[clamp(1rem,8cqw,2.25rem)] leading-tight";

    const subClass =
      size === "fixed"
        ? isRectangle
          ? "mt-0.5 text-base"
          : "mt-1 text-lg"
        : isRectangle
          ? "mt-0.5 text-[clamp(0.6rem,2.5cqw,1rem)]"
          : "mt-1 text-[clamp(0.7rem,3.5cqw,1.125rem)]";

    return (
      <div
        ref={ref}
        className={cn(shell, className)}
        style={{
          backgroundColor: primaryColor,
          containerType: size === "fluid" ? "size" : undefined,
        }}
      >
        <BrandLogo
          size={isRectangle ? "md" : "lg"}
          className={cn(
            isRectangle ? "shrink-0" : "mb-2",
            size === "fluid" &&
              (isRectangle
                ? "h-[clamp(1.5rem,28%,3rem)] w-auto"
                : "mb-[3%] h-[clamp(2rem,35%,6rem)] w-auto"),
          )}
          backgroundColor={primaryColor}
        />
        <div
          className={cn(
            "text-center",
            isRectangle && "min-w-0 flex-1 text-left",
          )}
        >
          <p className={cn("font-bold", titleClass)} style={{ color: localColor }}>
            {localLabel}
          </p>
          <p className={subClass} style={{ color: canvasInk }}>
            {subText}
          </p>
        </div>
      </div>
    );
  },
);
