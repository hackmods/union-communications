"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandKitPreview } from "@/components/brand/BrandKitPreview";
import { BrandLookbookScope } from "@/components/brand/BrandLookbookScope";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Callout } from "@/components/ui/Callout";
import { Card, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Radio, RadioGroup } from "@/components/ui/Radio";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { chromeDiffersFromPrimary } from "@/lib/brand/lookbook-kit";
import { resolveBrandChromeTokens } from "@/lib/brand/chrome-tokens";
import {
  canvasFontFamily,
  type CanvasFontId,
} from "@/lib/comms/canvas-fonts";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import { cn } from "@/lib/utils";
import type { BrandKit } from "@/types/entities";

export type BrandLookbookMode = "full" | "compact";

const FULL_SECTIONS = [
  "foundations",
  "actions",
  "forms",
  "selection",
  "feedback",
  "surfaces",
  "comms",
  "overlays",
] as const;

const COMPACT_SECTIONS = [
  "foundations",
  "actions",
  "feedback",
  "comms",
] as const;

type LookbookSection = (typeof FULL_SECTIONS)[number];

function Swatch({
  label,
  hex,
  note,
}: {
  label: string;
  hex: string;
  note?: string;
}) {
  return (
    <div className="min-w-0">
      <div
        className="h-16 w-full rounded-lg border border-slate-200"
        style={{ backgroundColor: hex }}
        aria-hidden="true"
      />
      <p className="mt-1.5 text-xs font-semibold text-opseu-dark">{label}</p>
      <p className="font-mono text-xs text-slate-600">{hex}</p>
      {note ? <p className="mt-0.5 text-xs text-slate-500">{note}</p> : null}
    </div>
  );
}

function Specimen({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <h3 className="text-sm font-semibold text-opseu-dark">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function BrandLookbook({
  brandKit,
  hydrated = true,
  mode = "full",
  className,
  idPrefix,
  showCommsStyleLink = false,
  chromeStrips = null,
}: {
  brandKit: BrandKit;
  hydrated?: boolean;
  mode?: BrandLookbookMode;
  className?: string;
  idPrefix?: string;
  showCommsStyleLink?: boolean;
  /** Optional Phase 4 chrome strip slot (full mode). */
  chromeStrips?: React.ReactNode;
}) {
  const t = useTranslations("brandKit.lookbook");
  const tFonts = useTranslations("brandKit.canvas.fonts");
  const reactId = useId();
  const prefix = idPrefix ?? `lb-${reactId.replace(/:/g, "")}`;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<LookbookSection>("foundations");

  const sections: readonly LookbookSection[] =
    mode === "compact" ? COMPACT_SECTIONS : FULL_SECTIONS;

  useEffect(() => {
    const nodes = sections
      .map((id) => document.getElementById(`${prefix}-${id}`))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target.id) return;
        const id = top.target.id.replace(
          `${prefix}-`,
          "",
        ) as LookbookSection;
        if ((sections as readonly string[]).includes(id)) {
          setActiveSection(id);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5],
      },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [prefix, sections]);

  const chrome = resolveBrandChromeTokens(
    brandKit.primaryColor,
    brandKit.accentColor,
  );
  const chromeAdjusted = chromeDiffersFromPrimary(
    brandKit.primaryColor,
    brandKit.accentColor,
  );
  const canvasTokens = resolveCanvasTokens(brandKit);
  const headlineFontId = (brandKit.canvas?.headlineFontId ??
    "montserrat") as CanvasFontId;
  const bodyFontId = (brandKit.canvas?.bodyFontId ??
    "sourceSans") as CanvasFontId;

  const navClass =
    "text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-opseu-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opseu-blue data-[active]:text-opseu-blue data-[active]:underline";

  return (
    <BrandLookbookScope
      colours={brandKit}
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 sm:p-6",
        className,
      )}
    >
      <div data-testid="brand-lookbook">
        {mode === "full" ? (
          <header className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("eyebrow")}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-opseu-dark sm:text-3xl">
              {t("title")}
            </h2>
            <p className="mt-2 max-w-prose text-sm text-slate-600 sm:text-base">
              {t("description")}
            </p>
          </header>
        ) : (
          <header className="min-w-0">
            <h2 className="text-lg font-bold text-opseu-dark">
              {t("compactTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("compactDescription")}
            </p>
          </header>
        )}

        <nav
          aria-label={t("navLabel")}
          data-testid="brand-lookbook-nav"
          className="sticky top-20 z-10 mt-4 -mx-1 flex flex-wrap gap-x-4 gap-y-2 border-b border-slate-200 bg-white/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 motion-reduce:backdrop-blur-none"
        >
          {sections.map((id) => (
            <a
              key={id}
              href={`#${prefix}-${id}`}
              className={navClass}
              data-active={activeSection === id ? "true" : undefined}
              aria-current={activeSection === id ? "true" : undefined}
            >
              {t(`nav.${id}`)}
            </a>
          ))}
        </nav>

        <div className="mt-8 space-y-12">
          <section
            id={`${prefix}-foundations`}
            className="scroll-mt-36 space-y-6"
            aria-labelledby={`${prefix}-foundations-heading`}
          >
            <SectionHeading
              id={`${prefix}-foundations-heading`}
              title={t("foundations.title")}
              intro={t("foundations.intro")}
            />
            {mode === "full" && chromeStrips ? chromeStrips : null}
            <Specimen title={t("foundations.brandRamp")}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Swatch
                  label={t("foundations.primary")}
                  hex={brandKit.primaryColor}
                />
                <Swatch
                  label={t("foundations.secondary")}
                  hex={brandKit.secondaryColor}
                />
                <Swatch
                  label={t("foundations.accent")}
                  hex={brandKit.accentColor}
                />
              </div>
            </Specimen>
            <Specimen title={t("foundations.chrome")}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Swatch
                  label={t("foundations.interactive")}
                  hex={chrome.interactive}
                  note={
                    chromeAdjusted
                      ? t("foundations.interactiveNote")
                      : undefined
                  }
                />
                <Swatch
                  label={t("foundations.heading")}
                  hex={chrome.heading}
                />
              </div>
              {chromeAdjusted ? (
                <Callout tone="brand" className="mt-3">
                  <p>{t("foundations.chromeCallout")}</p>
                </Callout>
              ) : null}
            </Specimen>
            <Specimen title={t("foundations.type")}>
              <p
                className="text-2xl font-bold text-opseu-dark"
                style={{ fontFamily: canvasFontFamily(headlineFontId) }}
              >
                {t("foundations.typeHeadline", {
                  font: tFonts(headlineFontId),
                })}
              </p>
              <p
                className="mt-2 text-base text-slate-700"
                style={{ fontFamily: canvasTokens.bodyFontFamily }}
              >
                {t("foundations.typeBody", { font: tFonts(bodyFontId) })}
              </p>
            </Specimen>
          </section>

          <section
            id={`${prefix}-actions`}
            className="scroll-mt-36 space-y-6"
            aria-labelledby={`${prefix}-actions-heading`}
          >
            <SectionHeading
              id={`${prefix}-actions-heading`}
              title={t("actions.title")}
              intro={t("actions.intro")}
            />
            <Specimen title={t("actions.variants")}>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="primary">
                  {t("actions.primary")}
                </Button>
                <Button type="button" variant="secondary">
                  {t("actions.secondary")}
                </Button>
                <Button type="button" variant="outline">
                  {t("actions.outline")}
                </Button>
                <Button type="button" variant="ghost">
                  {t("actions.ghost")}
                </Button>
              </div>
            </Specimen>
            <Specimen title={t("actions.sizes")}>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm">
                  {t("actions.small")}
                </Button>
                <Button type="button" size="md">
                  {t("actions.base")}
                </Button>
                <Button type="button" size="lg">
                  {t("actions.large")}
                </Button>
                <Button type="button" disabled>
                  {t("actions.disabled")}
                </Button>
              </div>
            </Specimen>
            <Specimen title={t("actions.links")}>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/brand-kit" variant="primary" size="sm">
                  {t("actions.linkPrimary")}
                </ButtonLink>
                <ButtonLink href="/brand-kit" variant="outline" size="sm">
                  {t("actions.linkOutline")}
                </ButtonLink>
              </div>
            </Specimen>
          </section>

          {mode === "full" ? (
            <>
              <section
                id={`${prefix}-forms`}
                className="scroll-mt-36 space-y-6"
                aria-labelledby={`${prefix}-forms-heading`}
              >
                <SectionHeading
                  id={`${prefix}-forms-heading`}
                  title={t("forms.title")}
                  intro={t("forms.intro")}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={t("forms.inputLabel")}
                    placeholder={t("forms.inputPlaceholder")}
                    defaultValue=""
                  />
                  <Select label={t("forms.selectLabel")} defaultValue="a">
                    <option value="a">{t("forms.selectOptionA")}</option>
                    <option value="b">{t("forms.selectOptionB")}</option>
                  </Select>
                </div>
              </section>

              <section
                id={`${prefix}-selection`}
                className="scroll-mt-36 space-y-6"
                aria-labelledby={`${prefix}-selection-heading`}
              >
                <SectionHeading
                  id={`${prefix}-selection-heading`}
                  title={t("selection.title")}
                  intro={t("selection.intro")}
                />
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Checkbox
                      label={t("selection.checkboxOn")}
                      defaultChecked
                    />
                    <Checkbox label={t("selection.checkboxOff")} />
                  </div>
                  <RadioGroup legend={t("selection.radioLegend")}>
                    <Radio
                      name={`${prefix}-radio`}
                      value="one"
                      label={t("selection.radioOne")}
                      defaultChecked
                    />
                    <Radio
                      name={`${prefix}-radio`}
                      value="two"
                      label={t("selection.radioTwo")}
                    />
                  </RadioGroup>
                </div>
              </section>
            </>
          ) : null}

          <section
            id={`${prefix}-feedback`}
            className="scroll-mt-36 space-y-6"
            aria-labelledby={`${prefix}-feedback-heading`}
          >
            <SectionHeading
              id={`${prefix}-feedback-heading`}
              title={t("feedback.title")}
              intro={t("feedback.intro")}
            />
            <div className="space-y-3">
              <Callout tone="brand">
                <p>{t("feedback.brand")}</p>
              </Callout>
              <Callout tone="success">
                <p>{t("feedback.success")}</p>
              </Callout>
              <Callout tone="warning">
                <p>{t("feedback.warning")}</p>
              </Callout>
              <Callout tone="danger">
                <p>{t("feedback.danger")}</p>
              </Callout>
            </div>
            <Specimen title={t("feedback.badges")}>
              <div className="flex flex-wrap gap-2">
                <Badge>{t("feedback.badgeDefault")}</Badge>
                <Badge variant="success">{t("feedback.badgeSuccess")}</Badge>
                <Badge variant="warning">{t("feedback.badgeWarning")}</Badge>
                <Badge variant="danger">{t("feedback.badgeDanger")}</Badge>
                <Badge variant="muted">{t("feedback.badgeMuted")}</Badge>
              </div>
            </Specimen>
          </section>

          {mode === "full" ? (
            <section
              id={`${prefix}-surfaces`}
              className="scroll-mt-36 space-y-6"
              aria-labelledby={`${prefix}-surfaces-heading`}
            >
              <SectionHeading
                id={`${prefix}-surfaces-heading`}
                title={t("surfaces.title")}
                intro={t("surfaces.intro")}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Card variant="default" density="compact">
                  <CardTitle>{t("surfaces.cardDefault")}</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("surfaces.cardBody")}
                  </p>
                </Card>
                <Card variant="ghost" density="compact">
                  <CardTitle>{t("surfaces.cardGhost")}</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("surfaces.cardBody")}
                  </p>
                </Card>
                <Card variant="outline" density="compact">
                  <CardTitle>{t("surfaces.cardOutline")}</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("surfaces.cardBody")}
                  </p>
                </Card>
                <EmptyState
                  title={t("surfaces.emptyTitle")}
                  description={t("surfaces.emptyBody")}
                />
              </div>
              <Specimen title={t("surfaces.skeleton")}>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </Specimen>
            </section>
          ) : null}

          <section
            id={`${prefix}-comms`}
            className="scroll-mt-36 space-y-6"
            aria-labelledby={`${prefix}-comms-heading`}
          >
            <SectionHeading
              id={`${prefix}-comms-heading`}
              title={t("comms.title")}
              intro={t("comms.intro")}
            />
            <BrandKitPreview brandKit={brandKit} hydrated={hydrated} />
            {showCommsStyleLink ? (
              <ButtonLink
                href="/brand-kit#brand-style"
                variant="outline"
                size="sm"
              >
                {t("comms.styleLink")}
              </ButtonLink>
            ) : null}
          </section>

          {mode === "full" ? (
            <section
              id={`${prefix}-overlays`}
              className="scroll-mt-36 space-y-6"
              aria-labelledby={`${prefix}-overlays-heading`}
            >
              <SectionHeading
                id={`${prefix}-overlays-heading`}
                title={t("overlays.title")}
                intro={t("overlays.intro")}
              />
              <Button type="button" onClick={() => setDialogOpen(true)}>
                {t("overlays.open")}
              </Button>
              <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title={t("overlays.dialogTitle")}
                closeLabel={t("overlays.close")}
                footer={
                  <Button type="button" onClick={() => setDialogOpen(false)}>
                    {t("overlays.close")}
                  </Button>
                }
              >
                <p>{t("overlays.dialogBody")}</p>
              </Dialog>
            </section>
          ) : null}
        </div>
      </div>
    </BrandLookbookScope>
  );
}
