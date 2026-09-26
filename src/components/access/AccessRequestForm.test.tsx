import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { AccessRequestForm } from "@/components/access/AccessRequestForm";
import en from "../../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

describe("AccessRequestForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a offerings-specific error before calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AccessRequestForm kind="local_interest" locale="en" />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "Alex Rivera" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "alex@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Union"), {
      target: { value: "Behind 7 Proxies" },
    });
    fireEvent.change(screen.getByLabelText("Local name or number"), {
      target: { value: "Local 7" },
    });
    fireEvent.click(screen.getByLabelText(/I agree that UnionOps/));
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Choose Officer Hub, Local Portal/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps 429 to a localized rate-limit message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: "Too many submissions. Try again later." }),
      }),
    );

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AccessRequestForm kind="member_access" locale="en" />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "Alex Rivera" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "alex@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Union"), {
      target: { value: "Behind 7 Proxies" },
    });
    fireEvent.change(screen.getByLabelText("Local name or number"), {
      target: { value: "Local 7" },
    });
    fireEvent.click(screen.getByLabelText(/I agree that UnionOps/));
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Wait about ten minutes/,
      );
    });
  });
});
