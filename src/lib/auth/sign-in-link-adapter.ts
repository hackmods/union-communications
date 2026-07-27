export type SignInToken = {
  id: string;
  token: string;
  /** Normalized lowercase email */
  email: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  consumedAt?: string;
};

export type ConsumeSignInResult =
  | { ok: true; row: SignInToken }
  | { ok: false; error: "not_found" | "expired" | "consumed" };

export interface SignInTokenAdapter {
  createToken(input: {
    email: string;
    userId: string;
    ttlHours?: number;
  }): Promise<SignInToken>;

  getToken(token: string): Promise<SignInToken | null>;

  consumeToken(token: string): Promise<ConsumeSignInResult>;

  /** @internal test helper */
  resetForTests?(): void;
}
