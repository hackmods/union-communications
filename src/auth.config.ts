import type { NextAuthConfig } from "next-auth";
import { resolveAuthSecret } from "@/lib/auth/auth-secret";
import { applyTrustedSessionUpdate } from "@/lib/auth/session-update";

export const authConfig = {
  secret: resolveAuthSecret(),
  pages: {
    signIn: "/en/app/login",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isAppRoute =
        path.includes("/app") &&
        !path.includes("/app/login") &&
        !path.includes("/app/register");
      if (isAppRoute) return !!auth?.user;
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.unionId = user.unionId;
        token.divisionId = user.divisionId;
        token.localId = user.localId;
        token.bargainingUnitId = user.bargainingUnitId;
        token.accessibleLocalIds = user.accessibleLocalIds;
        token.roles = user.roles;
        token.mfaVerified = user.mfaVerified;
      }
      if (trigger === "update" && session) {
        applyTrustedSessionUpdate(token, session);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.unionId = token.unionId as string | undefined;
        session.user.divisionId = token.divisionId as string | undefined;
        session.user.localId = token.localId as string | undefined;
        session.user.bargainingUnitId = token.bargainingUnitId as
          | string
          | undefined;
        session.user.accessibleLocalIds = token.accessibleLocalIds as
          | string[]
          | undefined;
        session.user.roles = (token.roles as typeof session.user.roles) ?? [];
        session.user.mfaVerified = Boolean(token.mfaVerified);
      }
      return session;
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
