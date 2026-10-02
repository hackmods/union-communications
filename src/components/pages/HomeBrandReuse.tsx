"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { resolveLocalNumber } from "@/lib/utils/local";

const destinations = [
  { key: "graphics", href: "/create/graphic-maker" },
  { key: "letters", href: "/create/letter-generator" },
  { key: "website", href: "/create/website-template" },
] as const;

/** A live identity-to-tools diagram, not an imitation of generated output. */
export function HomeBrandReuse() {
  const t = useTranslations("home.brandReuse");
  const kit = useBrandStore((state) => state.brandKit);
  const colours = [kit.primaryColor, kit.secondaryColor, kit.accentColor];
  return (
    <div className="mt-6 min-w-0 border-t border-slate-300 pt-5 lg:col-span-2" data-testid="home-brand-reuse">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <p className="font-bold text-opseu-dark">
          {t(kit.local.localNumber.trim() ? "local" : "example", { number: resolveLocalNumber(kit.local.localNumber) })}
        </p>
        <span className="flex gap-1" aria-hidden="true">
          {colours.map((colour, index) => <span key={index} className="h-6 w-10 border border-black/10" style={{ backgroundColor: colour }} />)}
        </span>
        <p className="text-sm text-slate-600">{t("source")}</p>
      </div>
      <ul className="mt-4 grid list-none gap-x-8 p-0 sm:grid-cols-3">
        {destinations.map(({ key, href }) => (
          <li key={key} className="min-w-0 border-t border-slate-300 py-3">
            <span className="mb-2 flex h-1 w-16" aria-hidden="true">
              {colours.map((colour, index) => <span key={index} className="flex-1" style={{ backgroundColor: colour }} />)}
            </span>
            <Link href={href} className="inline-flex min-h-11 items-center font-semibold text-opseu-dark underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
