"use client";

// Demo sign-ins on the login pages of a public demo site. Off unless the demo
// env vars are set, each as "email|password":
//   NEXT_PUBLIC_DEMO_MEMBER_LOGIN, NEXT_PUBLIC_DEMO_BOARD_LOGIN
// Never set them on a real chapter: anyone who opens the login page sees them.
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export type DemoRole = "member" | "board";

type DemoLogin = { role: DemoRole; email: string; password: string };

function parse(role: DemoRole, raw: string | undefined): DemoLogin | null {
  const [email, password] = (raw ?? "").split("|").map((part) => part.trim());
  return email && password ? { role, email, password } : null;
}

export function demoLogins(): DemoLogin[] {
  return [
    parse("member", process.env.NEXT_PUBLIC_DEMO_MEMBER_LOGIN),
    parse("board", process.env.NEXT_PUBLIC_DEMO_BOARD_LOGIN),
  ].filter((login): login is DemoLogin => login !== null);
}

export const DEMO_HOME: Record<DemoRole, string> = { member: "/member/events", board: "/board" };

const COPY: Record<DemoRole, { title: string; body: string }> = {
  member: {
    title: "Open the member portal",
    body: "What every member sees after signing in: their events and tickets, the member directory, newsletters and the board's priorities.",
  },
  board: {
    title: "Open the board portal",
    body: "Where the board runs the chapter: dashboard, member roster, events and attendance, the prospects pipeline, goals and workboards.",
  },
};

/** Signs out of any current session, signs in as the demo role and opens its start page. */
export async function signInAsDemo(role: DemoRole): Promise<string | null> {
  const login = demoLogins().find((l) => l.role === role);
  if (!login) return "This demo sign-in is not set up.";
  const supabase = createBrowserSupabase();
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({ email: login.email, password: login.password });
  if (error) return "The demo sign-in did not work. The demo data may be resetting; try again in a minute.";
  window.location.assign(DEMO_HOME[role]);
  return null;
}

export function DemoLoginHint() {
  const logins = demoLogins();
  const [busy, setBusy] = useState<DemoRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  // /login?demo=member or ?demo=board (linked from the demo landing page) signs straight in.
  const searchParams = useSearchParams();
  const requested = searchParams.get("demo");
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    if (requested === "member" || requested === "board") {
      autoStarted.current = true;
      void use(requested);
    }
  }, [requested]);
  if (logins.length === 0) return null;

  async function use(role: DemoRole) {
    setBusy(role);
    setError(null);
    const problem = await signInAsDemo(role);
    if (problem) {
      setError(problem);
      setBusy(null);
    }
  }

  return (
    <section className="auth-demo" aria-label="Try the demo">
      <p className="auth-demo-title">Try the demo</p>
      <p className="auth-demo-lede">
        A chapter runs on three surfaces: the external website anyone can see, the member portal and the board portal.
        Everything here is a made-up chapter. Pick a portal; one click signs you in.
      </p>
      {error && <div className="auth-error">{error}</div>}
      {logins.map((login) => (
        <button
          key={login.role}
          type="button"
          className="auth-demo-choice"
          onClick={() => use(login.role)}
          disabled={busy !== null}
        >
          <span className="auth-demo-choice-title">
            {busy === login.role ? "Signing in..." : COPY[login.role].title}
          </span>
          <span className="auth-demo-choice-body">{COPY[login.role].body}</span>
          <span className="auth-demo-cred">
            {login.email} · password {login.password}
          </span>
        </button>
      ))}
      <p className="auth-demo-or">Or sign in below with either email and password.</p>
    </section>
  );
}
