import { NextResponse, type NextRequest } from "next/server";

import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });

  const { data, error } = await supabase.auth.getSession();
  const hasSession = !!data.session && !error;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/workspace") && !hasSession) {
    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  if (pathname === "/" && hasSession) {
    const redirectUrl = new URL("/workspace", request.url);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  return response;
}

export const config = {
  matcher: ["/workspace/:path*", "/"],
};
