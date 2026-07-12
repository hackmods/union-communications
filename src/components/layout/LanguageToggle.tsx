"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const switchLocale = (locale: string) => {
    router.replace(pathname, { locale: locale as "en" | "fr" });
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5" role="group" aria-label="Language">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchLocale(locale)}
          className={cn(
            "rounded-md px-2 py-1 text-base font-medium uppercase transition-colors",
            "hover:bg-opseu-blue/10",
            currentLocale === locale &&
              "bg-opseu-blue/10 font-semibold text-opseu-dark",
          )}
          aria-label={locale === "en" ? "English" : "Français"}
          aria-current={currentLocale === locale ? "true" : undefined}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
