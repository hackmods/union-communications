import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { resolveAuthSecret } from "@/lib/auth/auth-secret";
import { findDemoUser } from "@/lib/auth/demo-users";
import { findDbUser } from "@/lib/auth/find-db-user";
import { findInvitedUser } from "@/lib/auth/invites";
import { auditLog } from "@/lib/audit/store";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: resolveAuthSecret(),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Prefer durable users, then accepted invites, then gated demo roster (SEC-007).
        const account =
          (await findDbUser(email, password)) ??
          (await findInvitedUser(email, password)) ??
          (await findDemoUser(email, password));
        if (!account) return null;

        await auditLog.log({
          userId: account.id,
          action: "auth.login",
          resourceType: "session",
          resourceId: account.id,
          unionId: account.unionId,
          localId: account.localId,
        });

        return {
          id: account.id,
          name: account.name,
          email: account.email,
          unionId: account.unionId,
          divisionId: account.divisionId,
          localId: account.localId,
          bargainingUnitId: account.bargainingUnitId,
          accessibleLocalIds:
            "accessibleLocalIds" in account
              ? account.accessibleLocalIds
              : undefined,
          roles: account.roles,
          mfaVerified: !account.requiresMfa,
        };
      },
    }),
  ],
});
