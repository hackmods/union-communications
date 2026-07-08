import type { UserRole } from "@/types/tenant";
import type {} from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    unionId?: string;
    divisionId?: string;
    localId?: string;
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
  roles: UserRole[];
  requiresMfa: boolean;
}
