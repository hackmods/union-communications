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
});
