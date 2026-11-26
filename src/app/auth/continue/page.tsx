// Landing page for one-time email links (reset, invite, magic link).
// The token is only used when the person presses the button, which POSTs to
// /auth/confirm. Link previews and email scanners only load this page.

import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = { title: "Continue", robots: { index: false } };

type Params = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function AuthContinuePage({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const type = one(sp.type);
  const title = type === "recovery" ? "Reset your password" : "Continue to sign in";

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">{CHAPTER_NAME}</div>
        <h1 className="auth-title">{title}</h1>
        <form method="post" action="/auth/confirm" className="auth-form">
          <input type="hidden" name="token_hash" value={one(sp.token_hash)} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={one(sp.next)} />
          <button type="submit" className="auth-btn">Continue</button>
        </form>
      </div>
    </div>
  );
}
