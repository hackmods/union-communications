import type { UserRole } from "@/types/tenant";
import type {} from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    unionId?: string;
    divisionId?: string;
    localId?: string;
    bargainingUnitId?: string;
    /** Locals this user may switch into (elevated multi-local) */
    accessibleLocalIds?: string[];
    roles: UserRole[];
    mfaVerified: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      unionId?: string;
      divisionId?: string;
      localId?: string;
      bargainingUnitId?: string;
      accessibleLocalIds?: string[];
      roles: UserRole[];
      mfaVerified: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    unionId?: string;
    divisionId?: string;
    localId?: string;
    bargainingUnitId?: string;
    accessibleLocalIds?: string[];
    roles?: UserRole[];
    mfaVerified?: boolean;
  }
}

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  name: string;
  unionId?: string;
  divisionId?: string;
  localId?: string;
  bargainingUnitId?: string;
  accessibleLocalIds?: string[];
  roles: UserRole[];
  requiresMfa: boolean;
  /** Base32 TOTP secret when AUTH_MFA_MODE=totp (interim until users table). */
  totpSecret?: string;
}
