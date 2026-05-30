import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  const isMt5Tracking =
    url.searchParams.get("utm_source") === "mt5terminal" ||
    url.searchParams.get("utm_campaign") === "properties.expert";

  if (!isMt5Tracking) {
    return NextResponse.next();
  }

  url.searchParams.delete("utm_source");
  url.searchParams.delete("utm_medium");
  url.searchParams.delete("utm_campaign");

  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/:path*"],
};