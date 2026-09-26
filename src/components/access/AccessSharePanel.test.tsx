import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { AccessSharePanel } from "@/components/access/AccessSharePanel";
import en from "../../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/brand/BrandLogo", () => ({
  BrandLogo: () => <div data-testid="brand-logo" />,
}));

vi.mock("@/store/brand-store", () => ({
  useBrandStore: (
    selector: (s: { brandKit: { local: { localNumber: string } } }) => unknown,
  ) =>
    selector({
      brandKit: { local: { localNumber: "243" } },
    }),
}));

describe("AccessSharePanel", () => {
  it("shows thanks/share copy with tenant line and Hub CTA for local interest", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AccessSharePanel
          variant="local_interest"
          unionName="Behind 7 Proxies"
          localNumber="7"
        />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("heading", {
        name: "You’re already in — thanks for joining",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Behind 7 Proxies · Local 7/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Officer Hub" }),
    ).toHaveAttribute("href", "/app");
    expect(
      screen.getByRole("link", { name: "Bring your local (/join)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request member access" }),
    ).toBeInTheDocument();
  });
});
