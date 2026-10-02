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
        name?: string;
        email?: string;
        roles?: string[];
        unionId?: string;
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
  signOut: vi.fn(),
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

vi.mock("@/lib/features/officer-hub-public", () => ({
  isOfficerHubPublic: () => false,
}));

vi.mock("@/lib/tenant/loader", () => ({
  getTenantContext: () => ({
    union: { enabledModules: ["portal"] },
  }),
}));

vi.mock("@/components/platform/PlatformOperatorAccountLinks", () => ({
  PlatformOperatorAccountLinks: () => null,
}));

import { AuthAccountControls } from "@/components/layout/AuthAccountControls";
import { LocalPortalNavLink } from "@/components/layout/LocalPortalNavLink";
import { OfficerHubNavLink } from "@/components/layout/OfficerHubNavLink";

const signedInUser = {
  id: "user-1",
  name: "Ryan Morris",
  email: "ryan@example.com",
  roles: ["local_president"],
  unionId: "union-b7p",
};

afterEach(() => {
  cleanup();
  sessionState.status = "authenticated";
  sessionState.data = null;
  updateMock.mockReset();
});

describe("public auth chrome during JWT refresh", () => {
  it("keeps Local Portal link when status is loading but session.user remains", () => {
    sessionState.status = "loading";
    sessionState.data = { user: signedInUser };

    render(<LocalPortalNavLink />);

    expect(screen.getByTestId("local-portal-nav-link")).toBeInTheDocument();
    expect(
      screen.queryByTestId("local-portal-nav-loading"),
    ).not.toBeInTheDocument();
  });

  it("shows Local Portal cold-start skeleton when loading with no user", () => {
    sessionState.status = "loading";
    sessionState.data = null;

    render(<LocalPortalNavLink />);

    expect(screen.getByTestId("local-portal-nav-loading")).toBeInTheDocument();
    expect(
      screen.queryByTestId("local-portal-nav-link"),
    ).not.toBeInTheDocument();
  });

  it("keeps Profile and Sign out when status is loading but session.user remains", () => {
    sessionState.status = "loading";
    sessionState.data = { user: signedInUser };

    render(
      <AuthAccountControls
        layout="inline"
        showHubLink={false}
        showPortalLink={false}
      />,
    );

    expect(screen.getByTestId("auth-profile-link")).toBeInTheDocument();
    expect(screen.getByTestId("auth-sign-out")).toBeInTheDocument();
    expect(
      screen.queryByTestId("auth-account-loading"),
    ).not.toBeInTheDocument();
  });

  it("shows account cold-start skeletons when loading with no user", () => {
    sessionState.status = "loading";
    sessionState.data = null;

    render(
      <AuthAccountControls
        layout="inline"
        showHubLink={false}
        showPortalLink={false}
      />,
    );

    expect(screen.getByTestId("auth-account-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-profile-link")).not.toBeInTheDocument();
  });

  it("keeps Officer Hub link during refresh when Hub is invite-only", () => {
    sessionState.status = "loading";
    sessionState.data = { user: signedInUser };

    render(<OfficerHubNavLink />);

    expect(screen.getByTestId("officer-hub-nav-link")).toBeInTheDocument();
  });

  it("hides Officer Hub link when loading with no user and Hub is invite-only", () => {
    sessionState.status = "loading";
    sessionState.data = null;

    const { container } = render(<OfficerHubNavLink />);

    expect(container).toBeEmptyDOMElement();
  });
});
