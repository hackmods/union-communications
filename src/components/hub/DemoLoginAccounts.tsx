"use client";

import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import {
  DEMO_LOGIN_ACCOUNTS,
  DEMO_SHARED_PASSWORD,
} from "@/lib/auth/demo-login-accounts";
import { cn } from "@/lib/utils";

type DemoLoginAccountsProps = {
  onPick: (email: string, password: string) => void;
  className?: string;
};

export function DemoLoginAccounts({
  onPick,
  className,
}: DemoLoginAccountsProps) {
  const t = useTranslations("hub.demoAccounts");

  return (
    <Callout
      tone="muted"
      className={cn("px-3 py-2.5 sm:px-4", className)}
      role="region"
      aria-labelledby="demo-login-accounts-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="demo-login-accounts-heading"
          className="text-sm font-semibold text-gray-900"
        >
          {t("title")}
        </h2>
        <p className="text-xs text-gray-700">
          {t("password", { password: DEMO_SHARED_PASSWORD })}
        </p>
      </div>
      <p className="mt-1 text-xs text-gray-600">{t("lead")}</p>
      <ul className="mt-2 grid grid-cols-2 gap-1.5">
        {DEMO_LOGIN_ACCOUNTS.map((account) => {
          const role = t(`roles.${account.roleKey}`);
          return (
            <li key={account.userId} className="min-w-0">
              <button
                type="button"
                className="flex min-h-11 w-full flex-col justify-center rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left hover:border-opseu-blue/40 hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
                aria-label={t("fill", { role })}
                onClick={() => onPick(account.email, DEMO_SHARED_PASSWORD)}
              >
                <span className="text-xs font-medium leading-snug text-gray-900">
                  {role}
                </span>
                <span
                  className="truncate font-mono text-[11px] leading-tight text-gray-500"
                  title={account.email}
                >
                  {account.email}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Callout>
  );
}
