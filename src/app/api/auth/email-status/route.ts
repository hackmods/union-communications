import { NextResponse } from "next/server";
import { isTransactionalEmailAvailable } from "@/lib/email/send";

/**
 * GET /api/auth/email-status
 * Public — tells the login UI whether transactional email is available.
 */
export async function GET() {
  return NextResponse.json({
    emailEnabled: isTransactionalEmailAvailable(),
  });
}
