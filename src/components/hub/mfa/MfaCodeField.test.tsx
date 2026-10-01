/** @vitest-environment jsdom */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { MfaCodeField } from "@/components/hub/mfa/MfaCodeField";

afterEach(() => cleanup());

function Harness({ onTotpComplete }: { onTotpComplete: (code: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <MfaCodeField
      label="Code"
      value={value}
      onChange={setValue}
      onTotpComplete={onTotpComplete}
    />
  );
}

describe("MfaCodeField", () => {
  it("fires onTotpComplete once when crossing into six digits", () => {
    const onTotpComplete = vi.fn();
    render(<Harness onTotpComplete={onTotpComplete} />);
    const input = screen.getByLabelText("Code");

    fireEvent.change(input, { target: { value: "12345" } });
    expect(onTotpComplete).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "123456" } });
    expect(onTotpComplete).toHaveBeenCalledTimes(1);
    expect(onTotpComplete).toHaveBeenCalledWith("123456");

    fireEvent.change(input, { target: { value: "123456" } });
    expect(onTotpComplete).toHaveBeenCalledTimes(1);
  });

  it("associates hint and error text with the focused input", () => {
    render(
      <MfaCodeField
        label="Authenticator code"
        value="123"
        onChange={() => undefined}
        hint="Use the current six-digit code."
        error="That code was already used."
      />,
    );
    const input = screen.getByLabelText("Authenticator code");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain("-hint");
    expect(describedBy).toContain("-error");
    expect(document.activeElement).toBe(input);
  });
});
