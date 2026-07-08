import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import createIntlMiddleware from "next-intl/middleware";
import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createIntlMiddleware(routing);

export default auth((req) => {
  if (req.auth && req.nextUrl.pathname.includes("/app/login")) {
    const locale = req.nextUrl.pathname.split("/")[1] || "en";
    return NextResponse.redirect(new URL(`/${locale}/app`, req.url));
  }
  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
