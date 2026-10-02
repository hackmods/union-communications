"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import hubEn from "@/../public/product-previews/hub-en.png";
import hubFr from "@/../public/product-previews/hub-fr.png";
import hubEnPhone from "@/../public/product-previews/hub-en-phone.png";
import hubFrPhone from "@/../public/product-previews/hub-fr-phone.png";
import portalEn from "@/../public/product-previews/portal-en.png";
import portalFr from "@/../public/product-previews/portal-fr.png";
import portalEnPhone from "@/../public/product-previews/portal-en-phone.png";
import portalFrPhone from "@/../public/product-previews/portal-fr-phone.png";

const captures = {
  hub: { en: [hubEn, hubEnPhone], fr: [hubFr, hubFrPhone] },
  portal: { en: [portalEn, portalEnPhone], fr: [portalFr, portalFrPhone] },
} as const;

/** Actual demo-account excerpts; never mounts authenticated stores on Home. */
export function HostedProductPreview({ audience }: { audience: "hub" | "portal" }) {
  const locale = useLocale() === "fr" ? "fr" : "en";
  const t = useTranslations("home.hostedPreview");
  const [desktop, phone] = captures[audience][locale];
  return (
    <figure className="mt-5 min-w-0" data-testid={`home-${audience}-capture`}>
      <picture>
        <source media="(max-width: 639px)" srcSet={phone.src} width={phone.width} height={phone.height} />
        <Image src={desktop} alt={t(`${audience}Alt`)} className="h-auto w-full border border-slate-200" />
      </picture>
      <figcaption className="mt-2 text-xs leading-relaxed text-slate-600">
        {t(`${audience}Caption`)}{" "}
        <a href={desktop.src} className="inline-flex min-h-11 items-center font-semibold text-opseu-dark underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
          {t("fullSize")}
        </a>
      </figcaption>
    </figure>
  );
}
