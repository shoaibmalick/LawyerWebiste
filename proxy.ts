import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` — this is
// that file, not dead code. See CLAUDE.md "Next.js 16 caveat".
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const isAccountAuthRoute = pathname === "/account/login" || pathname === "/account/signup";
  if (
    pathname.startsWith("/account") &&
    !isAccountAuthRoute &&
    req.auth?.user?.role !== "customer"
  ) {
    return NextResponse.redirect(new URL("/account/login", req.url));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*"],
};
