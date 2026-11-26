// Token-hash auth confirm handler.
//
// Email links (password reset, invite, magic link) point straight at THIS
// route on our own domain, e.g.
//   https://www.example.com/auth/confirm?token_hash=...&type=recovery&next=/reset-password
//
// Because the link targets our domain (not Supabase's /auth/v1/verify endpoint),
// it does NOT depend on Supabase's redirect allow-list.
//
// Opening the link (GET) uses up nothing: it shows /auth/continue, whose
// button POSTs back here to verify the one-time token_hash. Link previews
// (WhatsApp, Lark) and email scanners fetch links with GET, and used to burn
// the token before the person ever tapped it.
//
// This complements /api/auth/callback (which handles the PKCE ?code= flow).

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { safeNextPath } from "@/lib/safe-next";

export async function GET(request: NextRequest) {
  const { search, origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/auth/continue${search}`);
}

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const form = await request.formData();
  const token_hash = form.get("token_hash");
  const type = form.get("type") as EmailOtpType | null;
  // Same-origin relative paths only, so this can't be an open redirect.
  const next = safeNextPath(String(form.get("next") ?? "")) ?? "/member";

  // 303 so the browser follows with GET, not a re-POST.
  if (typeof token_hash !== "string" || !token_hash || !type) {
    return NextResponse.redirect(`${origin}/forgot-password?expired=1`, 303);
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
    return NextResponse.redirect(`${origin}/forgot-password?expired=1`, 303);
  }

  return NextResponse.redirect(`${origin}${next}`, 303);
}
