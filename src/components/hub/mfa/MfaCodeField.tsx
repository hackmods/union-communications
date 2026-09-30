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
  autoFocus?: boolean;
  id?: string;
  /** Fires once when a 6-digit TOTP value is complete (not for recovery codes). */
  onTotpComplete?: (code: string) => void;
  hint?: string;
};

/** Verification code field — 6-digit TOTP or longer recovery codes. */
export function MfaCodeField({
  label,
  value,
  onChange,
  allowRecovery = false,
  disabled,
  autoComplete = "one-time-code",
  autoFocus,
  id,
  onTotpComplete,
  hint,
}: MfaCodeFieldProps) {
  return (
    <div className="space-y-1">
      <Input
        id={id}
        label={label}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => {
          const raw = e.target.value;
          const prevLen = value.replace(/\D/g, "").length;
          if (allowRecovery) {
            const next = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 19);
            onChange(next);
            // Only when crossing into a complete TOTP — avoids re-firing on
            // autofill / duplicate change events for the same six digits.
            if (
              /^\d{6}$/.test(next) &&
              prevLen < 6 &&
              onTotpComplete
            ) {
              onTotpComplete(next);
            }
            return;
          }
          const next = raw.replace(/\D/g, "").slice(0, 6);
          onChange(next);
          if (next.length === 6 && prevLen < 6 && onTotpComplete) {
            onTotpComplete(next);
          }
        }}
        inputMode={allowRecovery ? "text" : "numeric"}
        autoComplete={autoComplete}
        maxLength={allowRecovery ? 19 : 6}
        placeholder={allowRecovery ? undefined : "000000"}
        disabled={disabled}
        required
      />
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
