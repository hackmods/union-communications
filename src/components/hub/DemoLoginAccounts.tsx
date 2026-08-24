"use client";

import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import {
  DEMO_LOGIN_ACCOUNTS,
  DEMO_SHARED_PASSWORD,
} from "@/lib/auth/demo-login-accounts";

type DemoLoginAccountsProps = {
  onPick: (email: string, password: string) => void;
};

export function DemoLoginAccounts({ onPick }: DemoLoginAccountsProps) {
  const t = useTranslations("hub.demoAccounts");

  return (
    <Callout
      tone="muted"
      className="mt-4"
      role="region"
      aria-labelledby="demo-login-accounts-heading"
    >
      <h2
        id="demo-login-accounts-heading"
        className="text-sm font-semibold text-gray-900"
      >
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-gray-600">{t("lead")}</p>
      <p className="mt-2 text-sm text-gray-800">
        {t("password", { password: DEMO_SHARED_PASSWORD })}
      </p>
      <ul className="mt-3 space-y-1.5">
        {DEMO_LOGIN_ACCOUNTS.map((account) => {
          const role = t(`roles.${account.roleKey}`);
          return (
            <li key={account.userId}>
              <button
                type="button"
                className="flex min-h-11 w-full flex-col items-start rounded-md border border-gray-200 bg-white px-3 py-2 text-left hover:border-opseu-blue/40 hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
                aria-label={t("fill", { role })}
                onClick={() => onPick(account.email, DEMO_SHARED_PASSWORD)}
              >
                <span className="text-sm font-medium text-gray-900">{role}</span>
                <span className="break-all font-mono text-xs text-gray-600">
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
