/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { sessionState, updateMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  sessionState: {
    status: "authenticated" as "authenticated" | "loading" | "unauthenticated",
    data: null as null | {
      user: {
        id: string;
        roles?: string[];
      };
    },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: sessionState.data,
    status: sessionState.status,
    update: updateMock,
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/app",
}));

import { PlatformOperatorAccountLinks } from "@/components/platform/PlatformOperatorAccountLinks";
import { PlatformOperatorNavDropdown } from "@/components/platform/PlatformOperatorNavDropdown";

const platformAdminUser = {
  id: "admin-1",
  roles: ["platform_admin"],
};

afterEach(() => {
  cleanup();
  sessionState.status = "authenticated";
  sessionState.data = null;
  updateMock.mockReset();
});

describe("platform operator chrome during JWT refresh", () => {
  it("keeps Platform admin nav link when status is loading but session.user remains", () => {
    sessionState.status = "loading";
    sessionState.data = { user: platformAdminUser };

    render(<PlatformOperatorNavDropdown />);

    expect(screen.getByTestId("platform-operator-nav-link")).toBeInTheDocument();
    expect(screen.getByTestId("platform-operator-nav-link")).toHaveTextContent(
      "menu",
    );
  });

  it("hides Platform admin nav link when loading with no session", () => {
    sessionState.status = "loading";
    sessionState.data = null;

    const { container } = render(<PlatformOperatorNavDropdown />);

    expect(container).toBeEmptyDOMElement();
  });

  it("keeps Platform admin account link when status is loading but session.user remains", () => {
    sessionState.status = "loading";
    sessionState.data = { user: platformAdminUser };

    render(<PlatformOperatorAccountLinks layout="stack" />);

    expect(
      screen.getByTestId("platform-operator-account-link"),
    ).toBeInTheDocument();
  });
});
