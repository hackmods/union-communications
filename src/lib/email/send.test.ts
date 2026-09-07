import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn((_opts?: unknown) => ({ sendMail }));

vi.mock("nodemailer", () => ({
  default: {
    createTransport,
  },
}));

describe("sendTransactionalEmail", () => {
  const envBackup = { ...process.env };
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const fetchSpy = vi.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    vi.resetModules();
    sendMail.mockReset();
    createTransport.mockClear();
    createTransport.mockImplementation(() => ({ sendMail }));
    sendMail.mockResolvedValue({ messageId: "msg-1" });
    infoSpy.mockClear();
    warnSpy.mockClear();
    errorSpy.mockClear();
    fetchSpy.mockReset();
    fetchSpy.mockRejectedValue(new Error("unexpected fetch"));
    process.env = { ...envBackup };
    delete process.env.EMAIL_ENABLED;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.EMAIL_FROM;
    delete process.env.MAILGUN_API_KEY;
    delete process.env.MAILGUN_DOMAIN;
    delete process.env.MAILGUN_API_BASE;
    delete process.env.MAILGUN_API_REGION;
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("returns not_configured when EMAIL_ENABLED is not true", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.EMAIL_FROM = "noreply@example.com";
    const { sendTransactionalEmail } = await import("./send");
    const result = await sendTransactionalEmail({
      to: "a@example.com",
      subject: "Hi",
      text: "Body",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_configured");
    }
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("returns not_configured when SMTP env is incomplete even if enabled", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.example.com";
    // missing EMAIL_FROM / SMTP_PORT
    const { sendTransactionalEmail } = await import("./send");
    const result = await sendTransactionalEmail({
      to: "a@example.com",
      subject: "Hi",
      text: "Body",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_configured");
    }
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends via nodemailer when enabled and configured", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    process.env.EMAIL_FROM = "UnionOps <noreply@example.com>";

    const { sendTransactionalEmail } = await import("./send");
    const result = await sendTransactionalEmail({
      to: "officer@example.com",
      subject: "Invite",
      text: "Accept here",
      html: "<p>Accept here</p>",
    });

    expect(result).toEqual({
      ok: true,
      messageId: "msg-1",
      transport: "smtp",
    });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        connectionTimeout: 12_000,
        greetingTimeout: 12_000,
        socketTimeout: 12_000,
        auth: { user: "user", pass: "pass" },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith({
      from: "UnionOps <noreply@example.com>",
      to: "officer@example.com",
      subject: "Invite",
      text: "Accept here",
      html: "<p>Accept here</p>",
    });
    expect(infoSpy).toHaveBeenCalledWith(
      "[email/smtp] attempt smtp",
      expect.objectContaining({
        toDomain: "example.com",
      }),
    );
  });

  it("prefers Mailgun HTTPS API when MAILGUN_API_KEY is set (DigitalOcean SMTP block)", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.EMAIL_FROM = "UnionOps <admin@unionops.org>";
    process.env.MAILGUN_API_KEY = "key-test";
    process.env.MAILGUN_DOMAIN = "unionops.org";
    // SMTP also set — API must win
    process.env.SMTP_HOST = "smtp.mailgun.org";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "postmaster@unionops.org";
    process.env.SMTP_PASS = "smtp-pass";

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ id: "<msg@mailgun.org>", message: "Queued" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { sendTransactionalEmail, getSmtpConfigSnapshot } =
      await import("./send");
    expect(getSmtpConfigSnapshot().preferredTransport).toBe("mailgun_api");

    const result = await sendTransactionalEmail({
      to: "officer@example.com",
      subject: "Invite",
      text: "Accept here",
    });

    expect(result).toEqual({
      ok: true,
      messageId: "<msg@mailgun.org>",
      transport: "mailgun_api",
    });
    expect(sendMail).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.mailgun.net/v3/unionops.org/messages",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("retries SMTP port 2525 after CONN timeout on 465", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.mailgun.org";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "postmaster@example.com";
    process.env.SMTP_PASS = "pass";
    process.env.EMAIL_FROM = "noreply@example.com";

    const timeoutErr = Object.assign(new Error("Connection timeout"), {
      code: "ETIMEDOUT",
      command: "CONN",
    });
    sendMail
      .mockRejectedValueOnce(timeoutErr)
      .mockResolvedValueOnce({ messageId: "msg-2525" });

    const { sendTransactionalEmail } = await import("./send");
    const result = await sendTransactionalEmail({
      to: "a@example.com",
      subject: "Hi",
      text: "Body",
    });

    expect(result).toEqual({
      ok: true,
      messageId: "msg-2525",
      transport: "smtp",
    });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true }),
    );
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 2525, secure: false }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("retrying SMTP 2525"),
      expect.anything(),
    );
  });

  it("strips wrapping quotes from CapRover-style env values", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.SMTP_HOST = '"smtp.mailgun.org"';
    process.env.SMTP_PORT = '"587"';
    process.env.SMTP_USER = '"postmaster@mg.example.com"';
    process.env.SMTP_PASS = '"secret"';
    process.env.EMAIL_FROM = '"UnionOps <noreply@example.com>"';

    const { sendTransactionalEmail, getSmtpConfigSnapshot } =
      await import("./send");

    expect(getSmtpConfigSnapshot()).toMatchObject({
      host: "smtp.mailgun.org",
      port: 587,
      from: "UnionOps <noreply@example.com>",
      authConfigured: true,
      strippedQuotes: true,
      preferredTransport: "smtp",
    });

    await sendTransactionalEmail({
      to: "officer@example.com",
      subject: "Invite",
      text: "Accept here",
    });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.mailgun.org",
        port: 587,
        auth: { user: "postmaster@mg.example.com", pass: "secret" },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "UnionOps <noreply@example.com>",
      }),
    );
  });

  it("returns send_failed when transport throws a non-CONN error", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.EMAIL_FROM = "noreply@example.com";
    const err = Object.assign(new Error("relay down"), {
      code: "EENVELOPE",
      command: "DATA",
    });
    sendMail.mockRejectedValueOnce(err);

    const { sendTransactionalEmail } = await import("./send");
    const result = await sendTransactionalEmail({
      to: "a@example.com",
      subject: "Hi",
      text: "Body",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("send_failed");
      expect(result.error).toContain("relay down");
      expect(result.error).toContain("code=EENVELOPE");
      expect(result.smtp?.host).toBe("smtp.example.com");
      expect(result.smtp?.port).toBe(465);
    }
    expect(errorSpy).toHaveBeenCalledWith(
      "[email/smtp] send_failed smtp",
      expect.objectContaining({
        error: expect.stringContaining("relay down"),
      }),
    );
  });

  it("returns missing_recipient for empty to", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.EMAIL_FROM = "noreply@example.com";
    const { sendTransactionalEmail } = await import("./send");
    const result = await sendTransactionalEmail({
      to: "  ",
      subject: "Hi",
      text: "Body",
    });
    expect(result).toEqual({ ok: false, reason: "missing_recipient" });
  });
});
