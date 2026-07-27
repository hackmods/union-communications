import { randomBytes } from "crypto";
import type {
  ConsumeSignInResult,
  SignInToken,
  SignInTokenAdapter,
} from "./sign-in-link-adapter";

const DEFAULT_TTL_HOURS = 1;

function newId(): string {
  return `sit-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

export class MemorySignInTokenAdapter implements SignInTokenAdapter {
  private tokens: SignInToken[] = [];

  async createToken(input: {
    email: string;
    userId: string;
    ttlHours?: number;
  }): Promise<SignInToken> {
    const now = Date.now();
    const ttl = (input.ttlHours ?? DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
    const email = input.email.trim().toLowerCase();
    for (const row of this.tokens) {
      if (row.email === email && !row.consumedAt) {
        row.consumedAt = new Date(now).toISOString();
      }
    }
    const row: SignInToken = {
      id: newId(),
      token: randomBytes(24).toString("base64url"),
      email,
      userId: input.userId,
      expiresAt: new Date(now + ttl).toISOString(),
      createdAt: new Date(now).toISOString(),
    };
    this.tokens.push(row);
    return row;
  }

  async getToken(token: string): Promise<SignInToken | null> {
    return this.tokens.find((t) => t.token === token) ?? null;
  }

  async consumeToken(token: string): Promise<ConsumeSignInResult> {
    const row = await this.getToken(token);
    if (!row) return { ok: false, error: "not_found" };
    if (row.consumedAt) return { ok: false, error: "consumed" };
    if (new Date(row.expiresAt).getTime() < Date.now()) {
      row.consumedAt = new Date().toISOString();
      return { ok: false, error: "expired" };
    }
    row.consumedAt = new Date().toISOString();
    return { ok: true, row };
  }

  resetForTests(): void {
    this.tokens.length = 0;
  }
}

export const memorySignInTokenStore = new MemorySignInTokenAdapter();
