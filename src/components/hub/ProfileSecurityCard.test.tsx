/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { ProfileSecurityCard } from "@/components/hub/ProfileSecurityCard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        enabled: true,
        required: false,
        mode: "totp",
        enrolled: false,
        needsEnrollment: false,
        mfaVerified: false,
        reenrollGrace: true,
        recoveryCodesRemaining: null,
      }),
    ),
  );
});

describe("ProfileSecurityCard", () => {
  it("treats reset grace as required re-enrollment, not optional MFA", async () => {
    render(<ProfileSecurityCard />);

    expect(
      await screen.findByText("reenrollGraceTitle"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ctaReenroll" })).toHaveAttribute(
      "href",
      expect.stringContaining("/app/mfa/setup"),
    );
    expect(screen.queryByText("optionalBody")).not.toBeInTheDocument();
  });

  it("offers retry when security status cannot load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    render(<ProfileSecurityCard />);

    expect(await screen.findByText("loadFailed")).toBeInTheDocument();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          enabled: true,
          required: true,
          mode: "totp",
          enrolled: true,
          needsEnrollment: false,
          mfaVerified: true,
          reenrollGrace: false,
          recoveryCodesRemaining: 8,
        }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "loadFailedRetry" }));
    await waitFor(() => {
      expect(screen.getByText("verifiedTitle")).toBeInTheDocument();
    });
  });
});
