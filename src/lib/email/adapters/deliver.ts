/**
 * Server-only delivery adapter — re-exports classified send.
 * Do not import from `"use client"` Comms bundles.
 */
export {
  sendClassifiedEmail,
  sendTransactionalEmail,
  type ClassifiedEmailInput,
  type SendTransactionalEmailInput,
  type SendTransactionalEmailResult,
} from "@/lib/email/send";
