import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { MoveLocalPanel } from "./MoveLocalPanel";

const refresh = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh }),
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

function renderPanel(
  props?: Partial<React.ComponentProps<typeof MoveLocalPanel>>,
) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MoveLocalPanel
        localId="local-1"
        localNumber="7"
        currentUnionId="union-a"
        ownerDbReady
        onCancel={vi.fn()}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("MoveLocalPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads destination unions and supports search filter", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        unions: [
          { id: "union-a", name: "Source" },
          { id: "union-b", name: "Destination Alpha" },
          { id: "union-c", name: "Other Beta" },
        ],
        collectives: [],
      }),
    } as Response);

    renderPanel();
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Destination union" }),
      ).toBeTruthy(),
    );
    fireEvent.change(screen.getByLabelText("Filter destination unions"), {
      target: { value: "alpha" },
    });
    const select = screen.getByRole("combobox", { name: "Destination union" });
    expect(select.querySelectorAll("option").length).toBe(2); // placeholder + match
    expect(select.textContent).toContain("Destination Alpha");
    expect(select.textContent).not.toContain("Other Beta");
  });

  it("shows preview without MFA and step-up only on commit", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          unions: [{ id: "union-b", name: "Destination" }],
          collectives: [],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          preview: {
            fromUnionId: "union-a",
            toUnionId: "union-b",
            fromUnionName: "Source",
            toUnionName: "Destination",
            localNumber: "7",
            effectiveLocalNumber: "7",
            fromIsDemo: false,
            toIsDemo: false,
            fromMembershipPolicy: "multi_local",
            toMembershipPolicy: "multi_local",
            counts: {
              usersPrimary: 1,
              memberships: 1,
              invites: 0,
              bargainingUnits: 0,
              caseworkRows: 2,
              portalCircles: 1,
              tablesWithRows: 2,
            },
            blocks: [],
            warnings: [{ code: "casework_present", detail: "3" }],
            conflictingUserIds: [],
            canMove: true,
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: "Fresh MFA required",
          code: "mfa_step_up_required",
        }),
      } as Response);

    renderPanel();
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Destination union" }),
      ).toBeTruthy(),
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Destination union" }), {
      target: { value: "union-b" },
    });
    expect(
      screen.queryByText(/Commit needs a fresh authenticator code/i),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Preview move/i }));

    await waitFor(() =>
      expect(screen.getByTestId("local-move-preview")).toBeTruthy(),
    );
    expect(
      screen.getByText(/Commit needs a fresh authenticator code/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/Local 7: Source → Destination/i),
    ).toBeTruthy();
    expect(screen.getByText(/1 portal circles/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Refresh preview/i })).toBeTruthy();
    expect(
      screen.queryByLabelText(/Your authenticator code/i),
    ).toBeNull();

    fireEvent.click(
      screen.getByLabelText(/I understand these warnings and want to move this local/i),
    );
    fireEvent.change(
      screen.getByLabelText(/Type the current local number to confirm/i),
      { target: { value: "7" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Move local/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/Your authenticator code/i)).toBeTruthy(),
    );
    expect(screen.getByText("Move failed")).toBeTruthy();
  });

  it("shows owner DB banner and disables preview when host is not ready", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        unions: [{ id: "union-b", name: "Destination" }],
        collectives: [],
      }),
    } as Response);

    renderPanel({ ownerDbReady: false });
    await waitFor(() =>
      expect(
        screen.getByText(/Owner database required for moves/i),
      ).toBeTruthy(),
    );
    expect(
      screen.getByRole("button", { name: /Preview move/i }),
    ).toBeDisabled();
  });
});
