// Supabase Auth PKCE callback handler.
// Supabase redirects here after email confirmation, password reset, or magic link.
// We exchange the code for a session and redirect the user to their destination.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { safeNextPath, nextPathname } from "@/lib/safe-next";
import { provisionVerifiedUserProfile } from "@/lib/auth";
import { pageTier, roleHomePath } from "@/lib/access-map";
import { roleAtLeast } from "@/lib/access";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Same-site paths only: `${origin}${next}` with a raw value like
  // ".evil.com" would otherwise redirect to example.org.evil.com.
  const requestedNext = safeNextPath(searchParams.get("next"));

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              for (const { name, value, options } of cookiesToSet) {
                cookieStore.set(name, value, options as CookieOptions);
              }
            } catch {
              // Ignored in route handlers where headers may already be sent
            }
          },
        },
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const profile = await provisionVerifiedUserProfile(data.user);
      if (profile.ok) {
        const next =
          requestedNext &&
          roleAtLeast(profile.role, pageTier(nextPathname(requestedNext)))
            ? requestedNext
            : roleHomePath(profile.role);
        return NextResponse.redirect(new URL(next, origin));
      }
    }
  }

  // Code missing, expired, or profile provisioning failed: return to the
  // appropriate login surface without disclosing whether the email exists.
  const isStaffFlow =
    requestedNext?.startsWith("/admin") || requestedNext?.startsWith("/board");
  const fallback = isStaffFlow
    ? `${origin}/admin/login?error=auth_callback_failed`
    : `${origin}/login?error=auth_callback_failed`;
  return NextResponse.redirect(fallback);
}
