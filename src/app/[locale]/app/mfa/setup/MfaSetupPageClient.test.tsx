/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { updateMock, routerMock, routeState } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  routerMock: { push: vi.fn(), replace: vi.fn() },
  routeState: { query: "" },
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
  useSearchParams: () => new URLSearchParams(routeState.query),
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
vi.mock("@/components/hub/mfa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/hub/mfa")>();
  return {
  ...actual,
  MfaCodeField: ({
    label,
    value,
    onChange,
    onTotpComplete,
    allowRecovery,
    disabled,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onTotpComplete?: (value: string) => void;
    allowRecovery?: boolean;
    disabled?: boolean;
  }) => (
    <input
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => {
        const next = event.target.value;
        onChange(next);
        if (!allowRecovery && /^\d{6}$/.test(next)) onTotpComplete?.(next);
      }}
    />
  ),
  MfaHelpPanel: () => null,
  MfaJourneyShell: ({ title, children }: { title: string; children: React.ReactNode }) =>
    <main><h1>{title}</h1>{children}</main>,
  MfaStatusPanel: ({
    variant,
    newRecoveryCodes = [],
    onRotate,
    rotating,
  }: {
    variant: string;
    newRecoveryCodes?: string[];
    onRotate?: (code: string) => void;
    rotating?: boolean;
  }) => (
    <div>
      <span data-testid="mfa-variant">{variant}</span>
      <span data-testid="rotated-codes">{newRecoveryCodes.join(",")}</span>
      <button type="button" disabled={rotating} onClick={() => onRotate?.("123456")}>rotate</button>
    </div>
  ),
  MfaRecoveryCodesPanel: ({ codes }: { codes: string[] }) =>
    <div data-testid="recovery-codes">{codes.join(",")}</div>,
  MfaReplaceGate: ({ code, onCodeChange, onConfirm }: {
    code: string;
    onCodeChange: (value: string) => void;
    onConfirm: (value?: string) => void;
  }) => (
    <div>
      <input aria-label="Current authenticator code" value={code}
        onChange={(event) => {
          const next = event.target.value;
          onCodeChange(next);
          if (/^\d{6}$/.test(next)) onConfirm(next);
        }} />
      <button type="button" onClick={() => onConfirm(code)}>confirm replacement</button>
    </div>
  ),
  MfaSetupSteps: () => null,
  };
});
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn(async () => "data:image/png;base64,qr") } }));

import { MfaSetupPageClient } from "@/app/[locale]/app/mfa/setup/MfaSetupPageClient";
import { MfaPageClient } from "@/app/[locale]/app/mfa/MfaPageClient";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  updateMock.mockReset();
  routeState.query = "";
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
        expiresAt: Date.now() + 10 * 60_000,
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

  it("requires a fresh old-app code when regenerating a replacement QR", async () => {
    routeState.query = "mode=replace&next=%2Fapp%2Fexpenses";
    const enrollBodies: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/mfa/status")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ enabled: true, required: true, mode: "totp", enrolled: true }),
        };
      }
      enrollBodies.push(String(init?.body));
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          secret: `JBSWY3DPEHPK3PX${enrollBodies.length}`,
          otpauthUri: "otpauth://totp/UnionOps?secret=JBSWY3DPEHPK3PXP",
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MfaSetupPageClient />);
    const firstField = await screen.findByLabelText("Current authenticator code");
    fireEvent.change(firstField, { target: { value: "111111" } });
    await screen.findByLabelText("mfaSetupCodeLabel");

    fireEvent.click(screen.getByText("replace.generateAgain"));
    const secondField = await screen.findByLabelText("Current authenticator code");
    expect((secondField as HTMLInputElement).value).toBe("");
    fireEvent.change(secondField, { target: { value: "222222" } });
    await waitFor(() => expect(enrollBodies).toHaveLength(2));

    expect(enrollBodies).toEqual([
      JSON.stringify({ code: "111111" }),
      JSON.stringify({ code: "222222" }),
    ]);
  });

  it("consumes the post-rotation grant and refreshes status without hiding new codes", async () => {
    const codes = ["AAAA-BBBB-CCCC-DDDD"];
    const status = {
      enabled: true,
      required: true,
      mode: "totp",
      enrolled: true,
      needsEnrollment: false,
      mfaVerified: true,
      recoveryCodesRemaining: 10,
      reenrollGrace: false,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/api/mfa/status")) {
        return { ok: true, status: 200, headers: new Headers(), json: async () => status };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ recoveryCodes: codes, mfaGrant: "rotation-grant" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    updateMock.mockResolvedValue({ user: { mfaVerified: true } });

    render(<MfaPageClient />);
    await waitFor(() => expect(screen.getByTestId("mfa-variant").textContent).toBe("verified"));
    fireEvent.click(screen.getByText("rotate"));
    await waitFor(() => expect(screen.getByTestId("rotated-codes").textContent).toBe(codes.join(",")));

    expect(updateMock).toHaveBeenCalledWith({ mfaGrant: "rotation-grant" });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/mfa/status"))).toHaveLength(2);
    expect(screen.getByTestId("mfa-variant").textContent).toBe("verified");
  });

  it("keeps recovery entry separate so a six-digit prefix cannot auto-submit as TOTP", async () => {
    const status = {
      enabled: true,
      required: true,
      mode: "totp",
      enrolled: true,
      needsEnrollment: false,
      mfaVerified: false,
      recoveryCodesRemaining: 8,
      reenrollGrace: false,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      if (String(input).endsWith("/api/mfa/status")) {
        return { ok: true, status: 200, headers: new Headers(), json: async () => status };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ mfaGrant: "recovery-grant" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    updateMock.mockResolvedValue({ user: { mfaVerified: true } });

    render(<MfaPageClient />);
    fireEvent.click(await screen.findByText("recoveryChoice"));
    const recoveryField = await screen.findByLabelText("recoveryCodeLabel");
    fireEvent.change(recoveryField, { target: { value: "234567" } });
    expect(screen.getByText("verifyMfa").closest("button")).toBeDisabled();
    expect(fetchMock.mock.calls).toHaveLength(1);

    fireEvent.change(recoveryField, { target: { value: "ABCD-EFGH-JKLM-NPQR" } });
    fireEvent.click(screen.getByText("verifyMfa"));
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/app"));
    const verifyRequest = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/api/mfa/verify"));
    expect(verifyRequest?.[1]?.body).toBe(JSON.stringify({ code: "ABCD-EFGH-JKLM-NPQR" }));
  });

  it("hides an expired QR and offers a clean restart", async () => {
    let enrollCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/api/mfa/status")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ enabled: true, required: true, mode: "totp", enrolled: false }),
        };
      }
      enrollCount += 1;
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          secret: "JBSWY3DPEHPK3PXP",
          otpauthUri: "otpauth://totp/UnionOps?secret=JBSWY3DPEHPK3PXP",
          expiresAt: enrollCount === 1 ? Date.now() - 1000 : Date.now() + 600_000,
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MfaSetupPageClient />);
    fireEvent.click(await screen.findByText("mfaSetupGenerate"));
    expect(await screen.findByText("setupExpired.body")).toBeTruthy();
    expect(screen.queryByLabelText("mfaSetupCodeLabel")).toBeNull();
    fireEvent.click(screen.getByText("setupExpired.restart"));
    expect(await screen.findByLabelText("mfaSetupCodeLabel")).toBeTruthy();
    expect(enrollCount).toBe(2);
  });

  it("shows the Retry-After countdown and disables MFA submission while limited", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/api/mfa/status")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            enabled: true, required: true, mode: "totp", enrolled: true,
            needsEnrollment: false, mfaVerified: false, reenrollGrace: false,
          }),
        };
      }
      return {
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "3" }),
        json: async () => ({ code: "limited" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MfaPageClient />);
    const totpField = await screen.findByLabelText("authenticatorCodeLabel");
    fireEvent.change(totpField, { target: { value: "123456" } });
    expect(await screen.findByText(/^retryCountdown:00:0[23]$/)).toBeTruthy();
    expect(screen.getByText("verifyMfa").closest("button")).toBeDisabled();
  });
});
