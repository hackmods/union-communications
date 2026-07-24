import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail })),
  },
}));

describe("sendTransactionalEmail", () => {
  const envBackup = { ...process.env };

  beforeEach(async () => {
    vi.resetModules();
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: "msg-1" });
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
    expect(result).toEqual({ ok: false, reason: "not_configured" });
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
    expect(result).toEqual({ ok: false, reason: "not_configured" });
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

    expect(result).toEqual({ ok: true, messageId: "msg-1" });
    expect(sendMail).toHaveBeenCalledWith({
      from: "UnionOps <noreply@example.com>",
      to: "officer@example.com",
      subject: "Invite",
      text: "Accept here",
      html: "<p>Accept here</p>",
    });
  });

  it("returns send_failed when transport throws", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.EMAIL_FROM = "noreply@example.com";
    sendMail.mockRejectedValueOnce(new Error("relay down"));

    const { sendTransactionalEmail } = await import("./send");
    const result = await sendTransactionalEmail({
      to: "a@example.com",
      subject: "Hi",
      text: "Body",
    });
    expect(result).toEqual({
      ok: false,
      reason: "send_failed",
      error: "relay down",
    });
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
