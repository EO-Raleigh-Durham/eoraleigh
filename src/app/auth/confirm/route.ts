// Token-hash auth confirm handler.
//
// Email links (password reset, invite, magic link) point straight at THIS
// route on our own domain, e.g.
//   https://www.example.com/auth/confirm?token_hash=...&type=recovery&next=/reset-password
//
// Because the link targets our domain (not Supabase's /auth/v1/verify endpoint),
// it does NOT depend on Supabase's redirect allow-list. We verify the one-time
// token_hash, which sets the session cookies, then redirect onward.
//
// This complements /api/auth/callback (which handles the PKCE ?code= flow).

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { safeNextPath } from "@/lib/safe-next";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Same-origin relative paths only, so this can't be an open redirect.
  const next = safeNextPath(searchParams.get("next")) ?? "/member";

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/forgot-password?expired=1`);
  }

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

  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    return NextResponse.redirect(`${origin}/forgot-password?expired=1`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
