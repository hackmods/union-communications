import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { resolveAuthSecret } from "@/lib/auth/auth-secret";
import { findDemoUser } from "@/lib/auth/demo-users";
import { findDbUser } from "@/lib/auth/find-db-user";
import { findInvitedUser } from "@/lib/auth/invites";
import { consumeSignInGrant } from "@/lib/auth/sign-in-grants";
import { loadAuthAccountById } from "@/lib/auth/sign-inable-account";
import { auditLog } from "@/lib/audit/store";
import { isMfaEnabled } from "@/lib/auth/mfa-policy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: resolveAuthSecret(),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        signInGrant: { label: "Sign-in grant", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const signInGrant = credentials?.signInGrant as string | undefined;

        // Magic-link grant: single-use nonce issued after token consume.
        if (signInGrant && email) {
          const grant = consumeSignInGrant(signInGrant);
          if (!grant || grant.email !== email.trim().toLowerCase()) {
            return null;
          }
          const account = await loadAuthAccountById(grant.userId);
          if (!account || account.email.toLowerCase() !== grant.email) {
            return null;
          }

          await auditLog.log({
            userId: account.id,
            action: "auth.login_magic_link",
            resourceType: "session",
            resourceId: account.id,
            unionId: account.unionId,
            localId: account.localId,
          });

          const mfaVerified = !isMfaEnabled() || !account.requiresMfa;
          return {
            id: account.id,
            name: account.name,
            email: account.email,
            unionId: account.unionId,
            divisionId: account.divisionId,
            localId: account.localId,
            bargainingUnitId: account.bargainingUnitId,
            accessibleLocalIds: account.accessibleLocalIds,
            roles: account.roles,
            mfaVerified,
          };
        }

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

        // MFA off by default (AUTH_MFA_ENABLED); when off, treat as verified for Hub access.
        const mfaVerified = !isMfaEnabled() || !account.requiresMfa;

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
          mfaVerified,
        };
      },
    }),
  ],
});
