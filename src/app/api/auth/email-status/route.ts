import { NextResponse } from "next/server";
import {
  getSmtpConfigSnapshot,
  isEmailEnabled,
  isTransactionalEmailAvailable,
} from "@/lib/email/send";

/**
 * GET /api/auth/email-status
 * Public — tells the login UI whether transactional email is available,
 * plus a non-secret SMTP snapshot for operators debugging CapRover env.
 */
export async function GET() {
  return NextResponse.json({
    emailEnabled: isTransactionalEmailAvailable(),
    emailFlag: isEmailEnabled(),
    smtp: getSmtpConfigSnapshot(),
  });
}
