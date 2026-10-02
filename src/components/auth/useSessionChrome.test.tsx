/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { sessionState, updateMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  sessionState: {
    status: "authenticated" as "authenticated" | "loading" | "unauthenticated",
    data: null as null | { user: { id: string } },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: sessionState.data,
    status: sessionState.status,
    update: updateMock,
  }),
}));

import { useSessionChrome } from "@/components/auth/useSessionChrome";

function Probe() {
  const { authenticated, coldLoading, status } = useSessionChrome();
  return (
    <div
      data-testid="probe"
      data-authenticated={String(authenticated)}
      data-cold-loading={String(coldLoading)}
      data-status={status}
    />
  );
}

afterEach(() => {
  cleanup();
  sessionState.status = "authenticated";
  sessionState.data = null;
});

describe("useSessionChrome", () => {
  it("treats loading + session.user as still authenticated (JWT refresh)", () => {
    sessionState.status = "loading";
    sessionState.data = { user: { id: "u1" } };

    render(<Probe />);

    const probe = screen.getByTestId("probe");
    expect(probe).toHaveAttribute("data-authenticated", "true");
    expect(probe).toHaveAttribute("data-cold-loading", "false");
  });

  it("treats loading without user as cold start", () => {
    sessionState.status = "loading";
    sessionState.data = null;

    render(<Probe />);

    const probe = screen.getByTestId("probe");
    expect(probe).toHaveAttribute("data-authenticated", "false");
    expect(probe).toHaveAttribute("data-cold-loading", "true");
  });

  it("treats unauthenticated as signed out even if stale user were present", () => {
    sessionState.status = "unauthenticated";
    sessionState.data = { user: { id: "stale" } };

    render(<Probe />);

    const probe = screen.getByTestId("probe");
    expect(probe).toHaveAttribute("data-authenticated", "false");
    expect(probe).toHaveAttribute("data-cold-loading", "false");
  });
});
