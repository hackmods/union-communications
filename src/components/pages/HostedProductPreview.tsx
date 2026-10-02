"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
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

function usePhonePreview(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia("(max-width: 639px)");
      query.addEventListener("change", onStoreChange);
      return () => query.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(max-width: 639px)").matches,
    () => false,
  );
}

/** Actual demo-account excerpts; never mounts authenticated stores on Home. */
export function HostedProductPreview({ audience }: { audience: "hub" | "portal" }) {
  const locale = useLocale() === "fr" ? "fr" : "en";
  const t = useTranslations("home.hostedPreview");
  const phonePreview = usePhonePreview();
  const [desktop, phone] = captures[audience][locale];
  const fullSize = phonePreview ? phone : desktop;

  return (
    <figure className="mt-5 min-w-0" data-testid={`home-${audience}-capture`}>
      <picture>
        <source media="(max-width: 639px)" srcSet={phone.src} width={phone.width} height={phone.height} />
        <Image
          src={desktop}
          alt={t(`${audience}Alt`)}
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 100vw, 36rem"
          className="h-auto w-full border border-slate-200"
        />
      </picture>
      <figcaption className="mt-2 text-xs leading-relaxed text-slate-600">
        {t(`${audience}Caption`)}{" "}
        <a
          href={fullSize.src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-semibold text-opseu-dark underline decoration-opseu-blue underline-offset-4 hover:text-opseu-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
        >
          {t("fullSize")}
        </a>
      </figcaption>
    </figure>
  );
}
