// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // allow next internals
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // public pages
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/auth/register" ||
    pathname === "/api/price/commerce/create-charge/webhook"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // ✅ TEMP DEBUG LOGS (shows in Vercel logs)
  console.log("[middleware]", {
    path: pathname,
    hasToken: !!token,
    role: (token as any)?.role,
  });

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";

    // ✅ keep full callbackUrl (pathname + query)
    url.searchParams.set("callbackUrl", `${pathname}${search || ""}`);

    return NextResponse.redirect(url);
  }

  const role = String((token as any).role || "").toUpperCase();
  if (pathname === "/admin" || pathname.startsWith("/api/admin")) {
    if (role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/trade";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};