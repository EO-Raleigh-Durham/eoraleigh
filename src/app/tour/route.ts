import { NextResponse, type NextRequest } from "next/server";

// /tour is the short link in the README. The tour itself is a static page in
// public/tour/index.html, so send visitors there.
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/tour/index.html", request.url), 307);
}
