import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

function localeFromPath(pathname: string): string {
  const locale = pathname.split("/")[1];
  return routing.locales.includes(locale as "en" | "fr") ? locale : routing.defaultLocale;
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const locale = localeFromPath(pathname);
  const isLogin = pathname.includes("/app/login");
  const isAppRoute =
    pathname.includes("/app") && !isLogin && !pathname.includes("/app/register");

  if (req.auth && isLogin) {
    return NextResponse.redirect(new URL(`/${locale}/app`, req.url));
  }

  if (!req.auth && isAppRoute) {
    return NextResponse.redirect(new URL(`/${locale}/app/login`, req.url));
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
