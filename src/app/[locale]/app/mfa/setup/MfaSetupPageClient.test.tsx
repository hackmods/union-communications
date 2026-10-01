/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { updateMock, routerMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  routerMock: { push: vi.fn(), replace: vi.fn() },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "mfa-setup-ui-user" } },
    status: "authenticated",
    update: updateMock,
  }),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values ? `${key}:${Object.values(values).join(":")}` : key,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    <a href={href} {...props}>{children}</a>,
  useRouter: () => routerMock,
}));
vi.mock("@/components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    <button {...props}>{children}</button>,
}));
vi.mock("@/components/ui/Callout", () => ({
  Callout: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
}));
vi.mock("@/components/hub/mfa", () => ({
  MfaCodeField: ({
    label,
    value,
    onChange,
    onTotpComplete,
    disabled,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onTotpComplete?: (value: string) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => {
        const next = event.target.value;
        onChange(next);
        if (/^\d{6}$/.test(next)) onTotpComplete?.(next);
      }}
    />
  ),
  MfaHelpPanel: () => null,
  MfaJourneyShell: ({ title, children }: { title: string; children: React.ReactNode }) =>
    <main><h1>{title}</h1>{children}</main>,
  MfaRecoveryCodesPanel: ({ codes }: { codes: string[] }) =>
    <div data-testid="recovery-codes">{codes.join(",")}</div>,
  MfaReplaceGate: () => null,
  MfaSetupSteps: () => null,
}));
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn(async () => "data:image/png;base64,qr") } }));

import { MfaSetupPageClient } from "@/app/[locale]/app/mfa/setup/MfaSetupPageClient";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  updateMock.mockReset();
  routerMock.push.mockReset();
  routerMock.replace.mockReset();
});

describe("MfaSetupPageClient", () => {
  it("submits the sixth digit directly and keeps one-time codes when session refresh fails", async () => {
    const codes = ["AAAA-BBBB-CCCC-DDDD"];
    const jsonResponse = (body: unknown) => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => body,
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      void _init;
      const url = String(input);
      if (url.endsWith("/api/mfa/status")) {
        return jsonResponse({
          enabled: true, required: true, mode: "totp", enrolled: false,
        });
      }
      if (url.endsWith("/api/mfa/enroll/confirm")) {
        return jsonResponse({ recoveryCodes: codes, mfaGrant: "grant" });
      }
      return jsonResponse({
        secret: "JBSWY3DPEHPK3PXP", otpauthUri: "otpauth://totp/UnionOps?secret=JBSWY3DPEHPK3PXP",
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    updateMock.mockRejectedValue(new Error("session refresh failed"));

    render(<MfaSetupPageClient />);
    await waitFor(() => expect(screen.getByText("mfaSetupGenerate")).toBeTruthy());
    fireEvent.click(screen.getByText("mfaSetupGenerate"));
    const codeField = await screen.findByLabelText("mfaSetupCodeLabel");
    fireEvent.change(codeField, { target: { value: "123456" } });

    await waitFor(() => expect(screen.getByTestId("recovery-codes").textContent).toBe(codes.join(",")));
    expect(updateMock).toHaveBeenCalledWith({ mfaGrant: "grant" });
    const confirmRequest = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/api/mfa/enroll/confirm"));
    expect(confirmRequest?.[1]?.body).toBe(JSON.stringify({ code: "123456" }));
    expect(screen.getByText("session_not_verified")).toBeTruthy();
  });

  it("shows a status failure reference and retries instead of assuming the account is unenrolled", async () => {
    let statusReads = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/api/mfa/status")) {
        statusReads += 1;
        if (statusReads === 1) {
          return {
            ok: false,
            status: 503,
            headers: new Headers(),
            json: async () => ({ code: "status_unavailable", requestId: "req-123" }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ enabled: true, required: true, mode: "totp", enrolled: false }),
        };
      }
      throw new Error("Unexpected setup call");
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MfaSetupPageClient />);
    expect(await screen.findByText("statusUnavailable.title")).toBeTruthy();
    expect(screen.getByText(/^statusUnavailable\.reference/).textContent).toContain("req-123");
    fireEvent.click(screen.getByText("statusUnavailable.retry"));
    expect(await screen.findByText("mfaSetupGenerate")).toBeTruthy();
    expect(statusReads).toBe(2);
  });
});
