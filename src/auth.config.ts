import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET ?? "dev-secret-change-in-production",
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
        token.roles = user.roles;
        token.mfaVerified = user.mfaVerified;
      }
      if (trigger === "update" && session) {
        if (session.mfaVerified !== undefined) {
          token.mfaVerified = session.mfaVerified as boolean;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.unionId = token.unionId as string | undefined;
        session.user.divisionId = token.divisionId as string | undefined;
        session.user.localId = token.localId as string | undefined;
        session.user.roles = (token.roles as typeof session.user.roles) ?? [];
        session.user.mfaVerified = Boolean(token.mfaVerified);
      }
      return session;
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
