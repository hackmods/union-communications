/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={href}>{children}</a>,
}));

import { MfaReplaceGate } from "@/components/hub/mfa/MfaReplaceGate";

afterEach(() => cleanup());

describe("MfaReplaceGate", () => {
  it("requires explicit submit for a saved recovery code, even with a numeric prefix", () => {
    const onConfirm = vi.fn();
    render(<MfaReplaceGate onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "replace.recoveryChoice" }));
    const field = screen.getByLabelText("replace.recoveryCodeLabel");
    fireEvent.change(field, { target: { value: "234567" } });
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: "ABCD-EFGH-JKLM-NPQR" } });
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "replace.continue" }));
    expect(onConfirm).toHaveBeenCalledWith("ABCD-EFGH-JKLM-NPQR", "recovery");
  });

  it("keeps six-digit authenticator entry fast and announces proof selection state", () => {
    const onConfirm = vi.fn();
    render(<MfaReplaceGate onConfirm={onConfirm} />);

    const authenticatorChoice = screen.getByRole("button", { name: "replace.authenticatorChoice" });
    expect(authenticatorChoice).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByLabelText("replace.currentCodeLabel"), {
      target: { value: "123456" },
    });
    expect(onConfirm).toHaveBeenCalledWith("123456", "totp");
  });
});
