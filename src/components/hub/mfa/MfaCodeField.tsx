"use client";

import { useEffect, useId } from "react";
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
  error?: string | null;
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
  error,
}: MfaCodeFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `mfa-code-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  useEffect(() => {
    if (error && !disabled) document.getElementById(inputId)?.focus();
  }, [disabled, error, inputId]);

  return (
    <div className="space-y-1">
      <Input
        id={inputId}
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
        aria-invalid={Boolean(error)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
      />
      {hint ? <p id={hintId} className="text-xs text-gray-500">{hint}</p> : null}
      {error ? <p id={errorId} className="text-sm text-red-600" role="alert">{error}</p> : null}
    </div>
  );
}
