import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail })),
  },
}));

describe("sendTransactionalEmail", () => {
  const envBackup = { ...process.env };
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(async () => {
    vi.resetModules();
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: "msg-1" });
    infoSpy.mockClear();
    warnSpy.mockClear();
    errorSpy.mockClear();
    process.env = { ...envBackup };
    delete process.env.EMAIL_ENABLED;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.EMAIL_FROM;
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

    const nodemailer = await import("nodemailer");
    const { sendTransactionalEmail } = await import("./send");
    const result = await sendTransactionalEmail({
      to: "officer@example.com",
      subject: "Invite",
      text: "Accept here",
      html: "<p>Accept here</p>",
    });

    expect(result).toEqual({ ok: true, messageId: "msg-1" });
    expect(nodemailer.default.createTransport).toHaveBeenCalledWith(
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
      "[email/smtp] attempt",
      expect.objectContaining({
        toDomain: "example.com",
      }),
    );
  });

  it("strips wrapping quotes from CapRover-style env values", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.SMTP_HOST = '"smtp.mailgun.org"';
    process.env.SMTP_PORT = '"587"';
    process.env.SMTP_USER = '"postmaster@mg.example.com"';
    process.env.SMTP_PASS = '"secret"';
    process.env.EMAIL_FROM = '"UnionOps <noreply@example.com>"';

    const nodemailer = await import("nodemailer");
    const { sendTransactionalEmail, getSmtpConfigSnapshot } =
      await import("./send");

    expect(getSmtpConfigSnapshot()).toMatchObject({
      host: "smtp.mailgun.org",
      port: 587,
      from: "UnionOps <noreply@example.com>",
      authConfigured: true,
      strippedQuotes: true,
    });

    await sendTransactionalEmail({
      to: "officer@example.com",
      subject: "Invite",
      text: "Accept here",
    });

    expect(nodemailer.default.createTransport).toHaveBeenCalledWith(
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

  it("returns send_failed when transport throws", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.EMAIL_FROM = "noreply@example.com";
    const err = Object.assign(new Error("relay down"), {
      code: "ESOCKET",
      command: "CONN",
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
      expect(result.error).toContain("code=ESOCKET");
      expect(result.smtp?.host).toBe("smtp.example.com");
      expect(result.smtp?.port).toBe(465);
    }
    expect(errorSpy).toHaveBeenCalledWith(
      "[email/smtp] send_failed",
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
