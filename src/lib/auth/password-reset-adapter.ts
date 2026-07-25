export type PasswordResetToken = {
  id: string;
  token: string;
  /** Normalized lowercase email */
  email: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  consumedAt?: string;
};

export type ConsumePasswordResetResult =
  | { ok: true; row: PasswordResetToken }
  | { ok: false; error: "not_found" | "expired" | "consumed" };

export interface PasswordResetAdapter {
  createToken(input: {
    email: string;
    userId: string;
    ttlHours?: number;
  }): Promise<PasswordResetToken>;

  getToken(token: string): Promise<PasswordResetToken | null>;

  consumeToken(token: string): Promise<ConsumePasswordResetResult>;

  /** @internal test helper — clear in-memory rows when applicable */
  resetForTests?(): void;
}
