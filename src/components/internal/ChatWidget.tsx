"use client";

// Board chatbot widget: floating button + right slide-in panel, mounted in
// src/app/board/layout.tsx so it is available on every board page. Reuses the
// admin-shelf slide-in conventions (Escape/backdrop close, body scroll lock).
//
// The server is stateless: we hold the Anthropic messages array (opaque JSON
// echoed from the route's `done` event) plus render-friendly display items,
// both persisted to sessionStorage so a full page reload keeps the chat.

import { CHAPTER_NAME } from "@/kernel/config/chapter";
import { useCallback, useEffect, useRef, useState } from "react";
import { cancelProposal, confirmProposal } from "@/app/board/chat/actions";
import type { ProposalCard } from "@/lib/chatbot/card";

// The card is built on the server from the stored proposal and the records
// it targets (src/lib/chatbot/writes.ts describeAction). Optional only because
// cards saved in the browser before that change do not have one.
type ProposalInfo = {
  id: string;
  tool: string;
  card?: ProposalCard;
};

type ProposalStatus = "proposed" | "applying" | "applied" | "failed" | "cancelled";

type DisplayItem =
  | { kind: "user"; text: string }
  | { kind: "bot"; text: string; streaming?: boolean }
  | { kind: "tool"; detail: string }
  | { kind: "proposal"; proposal: ProposalInfo; status: ProposalStatus; error?: string }
  | { kind: "error"; text: string };

type SseEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; detail: string }
  | { type: "proposal"; proposal: ProposalInfo }
  | { type: "error"; error: string }
  | { type: "done"; messages: unknown[] };

const STORAGE_KEY = "chapter-board-chat";

// Restore persisted chat from sessionStorage. Runs as a lazy useState
// initializer (client-only via the window guard). Safe against hydration
// mismatch because the panel is closed on first render, so restored content
// is never in the server-rendered HTML.
function loadSaved(): { items: DisplayItem[]; messages: unknown[] } {
  if (typeof window === "undefined") return { items: [], messages: [] };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], messages: [] };
    const saved = JSON.parse(raw) as { items?: DisplayItem[]; messages?: unknown[] };
    const items = (saved.items ?? []).map((it) =>
      it.kind === "bot"
        ? { ...it, streaming: false }
        : it.kind === "proposal" && it.status === "applying"
          ? { ...it, status: "proposed" as const }
          : it,
    );
    return { items, messages: saved.messages ?? [] };
  } catch {
    return { items: [], messages: [] };
  }
}

// Minimal markdown: **bold**, `code`, "- " bullet lists, line breaks.
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={`${keyBase}-${i}`}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function BotText({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];
  const flush = (key: string) => {
    if (list.length) {
      out.push(<ul key={key}>{list}</ul>);
      list = [];
    }
  };
  lines.forEach((line, i) => {
    if (/^\s*[-*] /.test(line)) {
      list.push(<li key={`li-${i}`}>{renderInline(line.replace(/^\s*[-*] /, ""), `l${i}`)}</li>);
    } else {
      flush(`ul-${i}`);
      if (line.trim()) out.push(<p key={`p-${i}`}>{renderInline(line, `t${i}`)}</p>);
    }
  });
  flush("ul-end");
  return <>{out}</>;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DisplayItem[]>(() => loadSaved().items);
  const [messages, setMessages] = useState<unknown[]>(() => loadSaved().messages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist chat so it survives full page reloads (in-layout state already
  // survives client navigations between board pages).
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ items, messages }));
    } catch {
      // storage full: chat still works, just won't survive a reload
    }
  }, [items, messages]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [items, open]);

  const runTurn = useCallback(
    async (text: string, visible: boolean) => {
      setPending(true);
      if (visible) setItems((prev) => [...prev, { kind: "user", text }]);
      const nextMessages = [...messages, { role: "user", content: text }];

      try {
        const res = await fetch("/api/board/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setItems((prev) => [
            ...prev,
            { kind: "error", text: body?.error ?? `Request failed (${res.status})` },
          ]);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let gotDone = false;

        const handle = (event: SseEvent) => {
          if (event.type === "text") {
            setItems((prev) => {
              const last = prev[prev.length - 1];
              if (last?.kind === "bot" && last.streaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + event.text },
                ];
              }
              return [...prev, { kind: "bot", text: event.text, streaming: true }];
            });
          } else if (event.type === "tool") {
            setItems((prev) => [
              ...prev.map((it) => (it.kind === "bot" ? { ...it, streaming: false } : it)),
              { kind: "tool", detail: event.detail },
            ]);
          } else if (event.type === "proposal") {
            setItems((prev) => [
              ...prev.map((it) => (it.kind === "bot" ? { ...it, streaming: false } : it)),
              { kind: "proposal", proposal: event.proposal, status: "proposed" },
            ]);
          } else if (event.type === "error") {
            setItems((prev) => [...prev, { kind: "error", text: event.error }]);
          } else if (event.type === "done") {
            gotDone = true;
            setMessages(event.messages);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf("\n\n")) !== -1) {
            const chunk = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            for (const line of chunk.split("\n")) {
              if (line.startsWith("data: ")) {
                try {
                  handle(JSON.parse(line.slice(6)) as SseEvent);
                } catch {
                  // skip malformed frame
                }
              }
            }
          }
        }
        if (!gotDone) {
          setItems((prev) => [
            ...prev,
            { kind: "error", text: "Response interrupted. Try again." },
          ]);
        }
      } catch {
        setItems((prev) => [
          ...prev,
          { kind: "error", text: "Could not reach the assistant. Try again." },
        ]);
      } finally {
        setItems((prev) =>
          prev.map((it) => (it.kind === "bot" ? { ...it, streaming: false } : it)),
        );
        setPending(false);
      }
    },
    [messages],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    void runTurn(text, true);
  }

  async function onConfirm(id: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.kind === "proposal" && it.proposal.id === id ? { ...it, status: "applying" } : it,
      ),
    );
    const result = await confirmProposal(id);
    setItems((prev) =>
      prev.map((it) =>
        it.kind === "proposal" && it.proposal.id === id
          ? result.ok
            ? { ...it, status: "applied" }
            : { ...it, status: "failed", error: result.error }
          : it,
      ),
    );
    // Tell the model what happened so the conversation state stays truthful.
    void runTurn(
      result.ok
        ? `[system note: the user clicked Confirm and the proposal was applied: ${result.summary}]`
        : `[system note: the user clicked Confirm but applying the proposal failed with: ${result.error}]`,
      false,
    );
  }

  async function onCancel(id: string) {
    const result = await cancelProposal(id);
    setItems((prev) =>
      prev.map((it) =>
        it.kind === "proposal" && it.proposal.id === id
          ? result.ok
            ? { ...it, status: "cancelled" }
            : { ...it, status: "failed", error: result.error }
          : it,
      ),
    );
  }

  function newChat() {
    setItems([]);
    setMessages([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <>
      <button
        type="button"
        className="chatw-fab"
        aria-label="Open board assistant"
        onClick={() => setOpen(true)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 12c0 4.418-4.03 8-9 8-1.02 0-2-.15-2.91-.43L4 21l1.02-3.4C3.77 16.2 3 14.19 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 12h.01M12 12h.01M15.5 12h.01"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="admin-shelf-portal">
          <button
            type="button"
            aria-label="Close"
            className="admin-shelf-backdrop"
            onClick={() => setOpen(false)}
          />
          <aside className="admin-shelf chatw-panel" role="dialog" aria-label="Board assistant">
            <div className="chatw-head">
              <div>
                <div className="admin-shelf-eyebrow">{CHAPTER_NAME}</div>
                <h2 className="admin-shelf-title">Board assistant</h2>
              </div>
              <div className="chatw-head-actions">
                {items.length > 0 && (
                  <button type="button" className="chatw-newchat" onClick={newChat}>
                    New chat
                  </button>
                )}
                <button
                  type="button"
                  className="admin-shelf-close"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="chatw-msgs" ref={scrollRef}>
              {items.length === 0 && (
                <div className="chatw-empty">
                  <p>
                    Ask anything about the chapter: members, forums, events, prospects,
                    surveys, marketing.
                  </p>
                  <p>
                    You can also ask me to update records (deal stages, forum placement,
                    board appointments, signals, inquiries). Nothing changes until you
                    confirm it.
                  </p>
                  <p className="chatw-empty-note">
                    Member company revenue is restricted and not available here.
                  </p>
                </div>
              )}

              {items.map((item, i) => {
                if (item.kind === "user") {
                  return (
                    <div key={i} className="chatw-msg chatw-msg--user">
                      {item.text}
                    </div>
                  );
                }
                if (item.kind === "bot") {
                  return (
                    <div key={i} className="chatw-msg chatw-msg--bot">
                      <BotText text={item.text} />
                    </div>
                  );
                }
                if (item.kind === "tool") {
                  return (
                    <div key={i} className="chatw-toolchip" title={item.detail}>
                      Queried the database
                    </div>
                  );
                }
                if (item.kind === "error") {
                  return (
                    <div key={i} className="chatw-msg chatw-msg--error">
                      {item.text}
                    </div>
                  );
                }
                const { proposal, status, error } = item;
                return (
                  <div key={i} className={`chatw-card chatw-card--${status}`}>
                    <div className="chatw-card-title">Proposed change</div>
                    <div className="chatw-card-summary">
                      {proposal.card
                        ? proposal.card.action
                        : "This proposal is out of date. Ask the assistant to propose it again."}
                    </div>
                    {proposal.card && (
                      <div className="chatw-card-rows">
                        <div className="chatw-card-row">
                          <span className="chatw-card-val">{proposal.card.record}</span>
                        </div>
                        {proposal.card.changes.map((c) => (
                          <div key={c.field} className="chatw-card-row">
                            <span className="chatw-card-key">{c.field}</span>
                            <span className="chatw-card-val">
                              {c.from === null ? c.to : `${c.from} → ${c.to}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {status === "proposed" && proposal.card && (
                      <div className="chatw-card-actions">
                        <button
                          type="button"
                          className="chatw-btn chatw-btn--confirm"
                          onClick={() => onConfirm(proposal.id)}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="chatw-btn chatw-btn--cancel"
                          onClick={() => onCancel(proposal.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {status === "applying" && <div className="chatw-card-status">Applying…</div>}
                    {status === "applied" && (
                      <div className="chatw-card-status chatw-card-status--ok">Applied</div>
                    )}
                    {status === "cancelled" && <div className="chatw-card-status">Cancelled</div>}
                    {status === "failed" && (
                      <div className="chatw-card-status chatw-card-status--err">
                        Failed: {error}
                      </div>
                    )}
                  </div>
                );
              })}

              {pending && <div className="chatw-typing">Thinking…</div>}
            </div>

            <form className="chatw-composer" onSubmit={onSubmit}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the chapter…"
                disabled={pending}
                aria-label="Message the board assistant"
              />
              <button type="submit" className="chatw-send" disabled={pending || !input.trim()}>
                Send
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
