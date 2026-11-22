import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { roleRank, TIER_RANK } from "./lib/access";
import { pageTier } from "./lib/access-map";
import { CONTRACTOR_HOME, PATHNAME_HEADER, grantAreaForPath } from "./lib/access-grants";
import { hasCurrentBoardAppointment, type BoardAccessClient } from "./lib/board-access";
import { firstPartyUser } from "./lib/oauth-client-token";
import { CHAPTER_NAME } from "./kernel/config/chapter";
import { PLANS_COOKIE, PLANS_COOKIE_MAX_AGE, decidePlans, isLinkPreviewBot, isPlansPath, plansFormHtml } from "./lib/plans-gate";

// Route guard.
//
// Session-based role gate using Supabase Auth. The proxy reads the session
// cookie, resolves the user's role from user_profiles, and redirects to the
// appropriate login page on access violations. The page tier comes from the
// access-map manifest; the user's role is mapped onto the same ladder.
//
// Route access matrix:
//   /admin/login        → always public
//   /admin/users        → super_admin only
//   /admin/board/*      → board or above
//   /admin/*            → super_admin only (default)
//   /member/*           → member or above
//   /login              → always public
//   /api/auth/*         → always public (Auth callbacks)
//   everything else     → pass through

type UserRole = "super_admin" | "board" | "member" | "guest" | "contractor";

interface UserProfile {
  role: UserRole;
  active: boolean;
  person_id: string | null;
}

async function getSessionRole(
  request: NextRequest,
  response: NextResponse,
): Promise<UserRole | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // A connector (OAuth client) token is never a website sign-in.
  const user = await firstPartyUser(client);
  if (!user) return null;

  // Query user_profiles for the role. We use the anon key here, so the
  // user must have a self_read RLS policy on user_profiles.
  const { data: profile, error } = await client
    .from("user_profiles")
    .select("role, active, person_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (error || !profile) return null;

  // Derive board access from appointments (single source of truth): a current
  // Chair/Co-Chair is elevated to the board tier even if their stored role is
  // lower. board_appointments is anon-readable, so this works at the edge.
  const { role, person_id } = profile as UserProfile;
  if (person_id && roleRank(role) < TIER_RANK.board) {
    if (await hasCurrentBoardAppointment(client as unknown as BoardAccessClient, person_id)) {
      return "board";
    }
  }
  return role;
}

// Constant-time comparison so the /share password gate cannot be timed.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Tell the app which path is being served (the board layout re-checks it).
  // Set here, before anything else, so a browser-sent value never survives.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // ── Always-public paths ──────────────────────────────────────────────────
  if (
    pathname === "/admin/login" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth/")
  ) {
    return response;
  }

  // ── Session-based role gate (manifest-driven) ─────────────────────────────
  // The page tier comes from the single access-map manifest; the user's role
  // is mapped onto the same ladder. One comparison replaces the per-prefix
  // branches. Behaviour mirrors the matrix in the header comment exactly.
  const tier = pageTier(pathname);
  if (tier !== "public") {
    const role = await getSessionRole(request, response);
    // Contractors pass only into grantable area routes; the layout, page and
    // Server Actions there verify the grant itself (this edge client cannot
    // read access_grants, which has no client RLS policy by design). Anywhere
    // else above their guest rank sends them back to their area.
    if (role === "contractor" && roleRank(role) < TIER_RANK[tier]) {
      if (grantAreaForPath(pathname)) return response;
      return NextResponse.redirect(new URL(CONTRACTOR_HOME, request.url));
    }
    if (roleRank(role) < TIER_RANK[tier]) {
      // Staff areas (/admin and /board) bounce to the admin login; everything
      // else (member areas) to /login. Carry the denied URL in ?next= so the
      // login page can return the visitor to where they were headed.
      const loginPath =
        pathname.startsWith("/admin") || pathname.startsWith("/board")
          ? "/admin/login"
          : "/login";
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── /plans access-code gate (src/lib/plans-gate.ts) ─────────────────────
  if (isPlansPath(pathname)) {
    let submitted: string | null = null;
    if (request.method === "POST") {
      try {
        const v = (await request.formData()).get("code");
        submitted = typeof v === "string" ? v.slice(0, 200) : "";
      } catch {
        submitted = "";
      }
    }
    const decision = await decidePlans(process.env.PLANS_CODE, request.cookies.get(PLANS_COOKIE)?.value, submitted);
    const noIndex = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "private, no-store" };
    if (decision.kind === "unconfigured") {
      return new NextResponse("Plans are not available.", { status: 503, headers: noIndex });
    }
    if (decision.kind === "form") {
      // Preview bots get 200 so chat apps draw the share card; the body is
      // still only the code form, never the document.
      return new NextResponse(plansFormHtml(decision.wrong, pathname), {
        status: isLinkPreviewBot(request.headers.get("user-agent")) ? 200 : 401,
        headers: { ...noIndex, "Content-Type": "text/html; charset=utf-8" },
      });
    }
    if (decision.kind === "unlock") {
      const back = NextResponse.redirect(new URL(pathname, request.url), 303);
      back.cookies.set(PLANS_COOKIE, decision.token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/plans",
        maxAge: PLANS_COOKIE_MAX_AGE,
      });
      return back;
    }
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  // ── SHARE_PASSWORD gate (unchanged) ──────────────────────────────────────
  if (pathname.startsWith("/share")) {
    const expected = process.env.SHARE_PASSWORD;
    if (!expected) {
      return new NextResponse("Sharing not configured. Set SHARE_PASSWORD.", { status: 503 });
    }
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": `Basic realm="${CHAPTER_NAME} Share"` },
      });
    }
    let providedPassword = "";
    try {
      const decoded = atob(authHeader.slice("Basic ".length));
      const colonIndex = decoded.indexOf(":");
      providedPassword = colonIndex === -1 ? "" : decoded.slice(colonIndex + 1);
    } catch {
      return new NextResponse("Authentication required", { status: 401 });
    }
    if (!timingSafeEqual(providedPassword, expected)) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": `Basic realm="${CHAPTER_NAME} Share"` },
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/).*)",
  ],
};
