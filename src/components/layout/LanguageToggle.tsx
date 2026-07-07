"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const router = useRouter();
  const pathname = usePathname();

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
            "rounded-md px-2 py-1 text-sm font-medium uppercase transition-colors",
            "hover:bg-opseu-blue/10",
          )}
          aria-label={locale === "en" ? "English" : "Français"}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
