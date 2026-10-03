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

  it("toggles Local Portal without reading a cleared currentTarget", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AccessRequestForm kind="local_interest" locale="en" />
      </NextIntlClientProvider>,
    );

    const portal = screen.getByLabelText("Local Portal");
    expect(portal).not.toBeChecked();
    fireEvent.click(portal);
    expect(portal).toBeChecked();
    fireEvent.click(portal);
    expect(portal).not.toBeChecked();
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

  it("tells people to retry if an earlier submit failed", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <AccessRequestForm kind="member_access" locale="en" />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByText("If an earlier try failed, send it again"),
    ).toBeVisible();
    expect(
      screen.getByText(/The request form was failing/),
    ).toBeVisible();
  });

  it("submits member access as a payload the API schema accepts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

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
      target: { value: "CAAT" },
    });
    fireEvent.change(screen.getByLabelText("Local name or number"), {
      target: { value: "243" },
    });
    fireEvent.click(screen.getByLabelText(/I agree that UnionOps/));
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => {
      expect(screen.getByText("Thanks. Your request was received.")).toBeVisible();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body) as Record<string, unknown>;
    const { accessRequestSchema } = await import(
      "@/lib/access-requests/validation"
    );
    expect(accessRequestSchema.safeParse(body).success).toBe(true);
    expect(body.kind).toBe("member_access");
    expect(body.role).toBeUndefined();
    expect(body.offerings).toEqual(["local_portal"]);

    fireEvent.click(screen.getByRole("button", { name: "Send another request" }));
    expect(screen.getByRole("button", { name: "Send request" })).toBeVisible();
    expect(
      screen.getByText("If an earlier try failed, send it again"),
    ).toBeVisible();
  });
});
