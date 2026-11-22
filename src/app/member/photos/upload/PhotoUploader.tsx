"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MARKETING_CONSENT_LABEL,
  MARKETING_CONSENT_TERMS,
  MAX_CAPTION_LENGTH,
  MAX_PHOTOS_PER_BATCH,
  normalizeEmail,
  refusePhoto,
} from "@/lib/chapter-photos";
import { useSpamTrap } from "@/components/SpamTrap";
import { savePhoto, startPhotoUploads } from "../actions";
import { savePublicPhoto, startPublicPhotoUploads } from "../../../photos/upload/actions";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

type Status = "ready" | "uploading" | "saving" | "done" | "error";
type Item = {
  key: string;
  file: File;
  preview: string;
  caption: string;
  status: Status;
  progress: number;
  error: string | null;
};

// Uploads one file to its signed URL. XHR rather than fetch so the bar can
// show real progress. Same request shape as storage-js uploadToSignedUrl.
function putToSignedUrl(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
    xhr.onerror = () => reject(new Error("Upload failed"));
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
  });
}

// mode "public" is the TEMPORARY no-sign-in upload at /photos/upload: it asks
// for an email and, once done, points people to sign in or create an account.
export function PhotoUploader({ mode = "member" }: { mode?: "member" | "public" }) {
  const isPublic = mode === "public";
  const [email, setEmail] = useState("");
  const trap = useSpamTrap();
  const [consent, setConsent] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  const patch = (key: string, change: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...change } : i)));

  function addFiles(files: FileList | File[]) {
    setNotice(null);
    const incoming = Array.from(files);
    const room = MAX_PHOTOS_PER_BATCH - items.filter((i) => i.status !== "done").length;
    if (incoming.length > room) {
      setNotice(`Up to ${MAX_PHOTOS_PER_BATCH} photos at a time. The extra ones were left out.`);
    }
    const added = incoming.slice(0, Math.max(0, room)).map((file): Item => {
      const refusal = refusePhoto({ name: file.name, type: file.type, size: file.size });
      return {
        key: crypto.randomUUID(),
        file,
        preview: refusal ? "" : URL.createObjectURL(file),
        caption: "",
        status: refusal ? "error" : "ready",
        progress: 0,
        error: refusal,
      };
    });
    setItems((list) => [...list, ...added]);
  }

  function remove(key: string) {
    setItems((list) => {
      const gone = list.find((i) => i.key === key);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return list.filter((i) => i.key !== key);
    });
  }

  async function uploadAll() {
    const queue = items.filter((i) => i.status === "ready");
    if (queue.length === 0) return;
    if (isPublic && !normalizeEmail(email)) {
      setNotice("Enter your email address first.");
      return;
    }
    if (!consent) {
      setNotice("Tick the box to give permission before uploading.");
      return;
    }
    setBusy(true);
    setNotice(null);
    queue.forEach((i) => patch(i.key, { status: "uploading", progress: 0, error: null }));

    const claims = queue.map((i) => ({ name: i.file.name, type: i.file.type, size: i.file.size }));
    const started = await (isPublic ? startPublicPhotoUploads(email, claims, trap.read(), consent) : startPhotoUploads(claims, consent)).catch(() => ({ ok: false as const, error: "Could not start the upload. Try again." }));
    if (!started.ok) {
      queue.forEach((i) => patch(i.key, { status: "ready" }));
      setNotice(started.error);
      setBusy(false);
      return;
    }

    // Three at a time keeps a phone connection from stalling.
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const index = next++;
        const item = queue[index];
        const ticket = started.tickets[index];
        if (!ticket || "error" in ticket) {
          patch(item.key, { status: "error", error: ticket?.error ?? "Could not start this upload." });
          continue;
        }
        try {
          await putToSignedUrl(ticket.signedUrl, item.file, (pct) => patch(item.key, { progress: pct }));
          patch(item.key, { status: "saving", progress: 100 });
          const saved = isPublic
            ? await savePublicPhoto(ticket.path, item.caption, email, consent)
            : await savePhoto(ticket.path, item.caption, consent);
          if (saved.ok) patch(item.key, { status: "done" });
          else patch(item.key, { status: "error", error: saved.error });
        } catch {
          patch(item.key, { status: "error", error: "The upload didn't finish. Remove it and try again." });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setBusy(false);
  }

  const ready = items.filter((i) => i.status === "ready").length;
  const done = items.filter((i) => i.status === "done").length;

  return (
    <div className="ptl-photo-uploader">
      {isPublic && trap.field}
      {isPublic && (
        <label className="ptl-label">
          Your email
          <input
            type="email"
            className="ptl-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`The email you use with ${CHAPTER_NAME}`}
            autoComplete="email"
            required
            disabled={busy}
          />
        </label>
      )}
      <div
        className={`ptl-photo-drop${dragging ? " is-dragging" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
      >
        <strong>Drop photos here</strong>
        <span className="text-muted">or click to choose files</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {notice && <p className="ptl-form-error">{notice}</p>}

      {items.length > 0 && (
        <ul className="ptl-photo-queue">
          {items.map((item) => (
            <li key={item.key} className="ptl-photo-row">
              <div className="ptl-photo-row-thumb">
                {item.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                  <img src={item.preview} alt="" />
                ) : null}
              </div>
              <div className="ptl-photo-row-body">
                <span className="ptl-photo-row-name">{item.file.name}</span>
                <input
                  type="text"
                  className="ptl-input"
                  placeholder="Caption (optional)"
                  maxLength={MAX_CAPTION_LENGTH}
                  value={item.caption}
                  disabled={item.status !== "ready"}
                  onChange={(e) => patch(item.key, { caption: e.target.value })}
                />
                {(item.status === "uploading" || item.status === "saving") && (
                  <div className="ptl-photo-progress" aria-label={`Upload ${item.progress}%`}>
                    <span style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.status === "saving" && <span className="text-muted">Saving</span>}
                {item.status === "done" && <span className="ptl-photo-ok">Uploaded</span>}
                {item.error && <span className="ptl-form-error">{item.error}</span>}
              </div>
              {(item.status === "ready" || item.status === "error") && !busy && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(item.key)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="ptl-photo-consent">
        <label className="ptl-photo-consent-check">
          <input
            type="checkbox"
            checked={consent}
            disabled={busy}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <span>{MARKETING_CONSENT_LABEL}</span>
        </label>
        <div className="ptl-photo-consent-terms">
          {MARKETING_CONSENT_TERMS.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </div>
      </div>

      <div className="ptl-photo-actions">
        <button type="button" className="btn btn--primary" disabled={busy || ready === 0 || !consent} onClick={uploadAll}>
          {busy ? "Uploading" : ready > 0 ? `Upload ${ready} photo${ready === 1 ? "" : "s"}` : "Upload"}
        </button>
        {done > 0 && !busy && !isPublic && (
          <Link href="/member/photos" className="btn btn--ghost">
            See the gallery
          </Link>
        )}
      </div>

      {isPublic && done > 0 && !busy && (
        <div className="ptl-photo-signin">
          <h2 className="ptl-modal-title">Thanks, your photos are in</h2>
          <p className="text-muted">
            Sign in to see the chapter gallery. Use {normalizeEmail(email) ?? "your email"} so your photos are
            linked to you. New here? Create your account with the same email.
          </p>
          <div className="ptl-photo-actions">
            <Link href="/login?next=%2Fmember%2Fphotos" className="btn btn--primary">
              Sign in
            </Link>
            <Link href="/login?tab=signup&next=%2Fmember%2Fphotos" className="btn btn--ghost">
              Create an account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
