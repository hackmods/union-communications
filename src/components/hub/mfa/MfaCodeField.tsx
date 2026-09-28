"use client";

import { Input } from "@/components/ui/Input";

type MfaCodeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Allow recovery-code length (alphanumeric with dashes). Default 6 for TOTP. */
  allowRecovery?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  id?: string;
};

/** Verification code field — 6-digit TOTP or longer recovery codes. */
export function MfaCodeField({
  label,
  value,
  onChange,
  allowRecovery = false,
  disabled,
  autoComplete = "one-time-code",
  id,
}: MfaCodeFieldProps) {
  return (
    <Input
      id={id}
      label={label}
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        if (allowRecovery) {
          onChange(next.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 19));
          return;
        }
        onChange(next.replace(/\D/g, "").slice(0, 6));
      }}
      inputMode={allowRecovery ? "text" : "numeric"}
      autoComplete={autoComplete}
      maxLength={allowRecovery ? 19 : 6}
      placeholder={allowRecovery ? undefined : "000000"}
      disabled={disabled}
      required
    />
  );
}
