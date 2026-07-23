import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { resolveAuthSecret } from "@/lib/auth/auth-secret";
import { findDemoUser } from "@/lib/auth/demo-users";
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

        const demo = findDemoUser(email, password);
        if (!demo) return null;

        await auditLog.log({
          userId: demo.id,
          action: "auth.login",
          resourceType: "session",
          resourceId: demo.id,
          unionId: demo.unionId,
          localId: demo.localId,
        });

        return {
          id: demo.id,
          name: demo.name,
          email: demo.email,
          unionId: demo.unionId,
          divisionId: demo.divisionId,
          localId: demo.localId,
          bargainingUnitId: demo.bargainingUnitId,
          accessibleLocalIds: demo.accessibleLocalIds,
          roles: demo.roles,
          mfaVerified: !demo.requiresMfa,
        };
      },
    }),
  ],
});
