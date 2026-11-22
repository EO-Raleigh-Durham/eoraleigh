// Server-side Supabase client using @supabase/ssr for cookie-based session handling.
// Use this in server components, route handlers, and proxy.ts to read the user session.
// NEVER import from a client component.

import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSessionClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // setAll may be called from a Server Component where cookie writes
            // are not permitted. The middleware handles session refresh in that case.
          }
        },
      },
    },
  );
}
