"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-base text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p>{t("madeBy")}</p>
          <p className="text-opseu-blue">{t("privacy")}</p>
        </div>
        <nav className="flex flex-wrap gap-4" aria-label="Footer">
          <Link href="/guide" className="hover:text-opseu-blue">
            {nav("guide")}
          </Link>
          <Link href="/examples" className="hover:text-opseu-blue">
            {nav("socialExamples")}
          </Link>
          <Link href="/captions" className="hover:text-opseu-blue">
            {nav("captions")}
          </Link>
          <Link href="/guide/resources" className="hover:text-opseu-blue">
            {nav("resources")}
          </Link>
          <Link href="/privacy" className="hover:text-opseu-blue">
            {nav("privacy")}
          </Link>
          <Link href="/accessibility" className="hover:text-opseu-blue">
            {nav("accessibility")}
          </Link>
          <Link href="/support" className="hover:text-opseu-blue">
            {nav("support")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
