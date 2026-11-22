"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Supabase appends the recovery token in the URL hash.
  // Calling getSession() here causes the SDK to exchange it automatically.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setMessage("Invalid or expired link. Please request a new one.");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    setStatus("loading");
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("success");
      setMessage("Password set. Redirecting to admin...");
      setTimeout(() => router.push("/board/overview"), 1500);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0C0C31" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: "2.5rem 2rem", width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "#0C0C31" }}>Set your password</div>
          <div style={{ color: "#666", fontSize: "0.875rem", marginTop: 4 }}>{CHAPTER_NAME} chapter manager account</div>
        </div>

        {!ready && !message && (
          <p style={{ textAlign: "center", color: "#666" }}>Verifying link...</p>
        )}

        {message && !ready && (
          <p style={{ textAlign: "center", color: "#c00" }}>{message}</p>
        )}

        {ready && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4, color: "#333" }}>
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                style={{ width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "1rem", boxSizing: "border-box" }}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4, color: "#333" }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                style={{ width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "1rem", boxSizing: "border-box" }}
                placeholder="Repeat password"
              />
            </div>

            {message && (
              <p style={{ color: status === "success" ? "#0a0" : "#c00", fontSize: "0.875rem", margin: 0 }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || status === "success"}
              style={{ background: "#3D46F2", color: "#fff", border: "none", borderRadius: 6, padding: "0.75rem", fontWeight: 600, fontSize: "1rem", cursor: "pointer", opacity: status === "loading" ? 0.7 : 1 }}
            >
              {status === "loading" ? "Saving..." : "Set password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
