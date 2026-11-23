"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { putToSignedUrl } from "@/kernel/ui/upload";
import { CONSTITUTION_ACCEPT, validateConstitutionFile } from "@/lib/forum-constitution-files";
import { deleteConstitution, saveConstitution, startConstitutionUpload } from "../actions";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

type Props = {
  forumId: string;
  forumName: string;
  current: { fileName: string; uploadedByName: string | null; uploadedAt: string } | null;
};

export default function ConstitutionPanel({ forumId, forumName, current }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ name: string; progress: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = uploading !== null || deleting;

  // Picking or dropping a file uploads it straight away: there is no second
  // "Upload" step to miss.
  async function upload(file: File) {
    const problem = validateConstitutionFile(file);
    if (problem) return setError(problem);
    if (current && !window.confirm(`Replace the ${forumName} constitution (${current.fileName}) with ${file.name}?`)) return;

    setError(null);
    setUploading({ name: file.name, progress: 0 });
    const started = await startConstitutionUpload(forumId, { name: file.name, size: file.size });
    if (!started.ok) {
      setUploading(null);
      return setError(started.error);
    }
    const sent = await putToSignedUrl(started.signedUrl, file, (progress) => setUploading({ name: file.name, progress }));
    const saved = sent.ok
      ? await saveConstitution(forumId, started.path, file.name)
      : { ok: false as const, error: sent.error ?? "Upload failed." };
    setUploading(null);
    if (!saved.ok) return setError(saved.error);
    router.refresh();
  }

  function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still fires
    if (file) void upload(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  async function remove() {
    if (!current) return;
    if (!window.confirm(`Delete the ${forumName} constitution (${current.fileName})? This cannot be undone.`)) return;
    setError(null);
    setDeleting(true);
    const result = await deleteConstitution(forumId);
    setDeleting(false);
    if (!result.ok) return setError(result.error);
    router.refresh();
  }

  const choose = () => fileInput.current?.click();

  return (
    <section
      className={`frm-group frm-const${dragOver ? " frm-const--over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={fileInput}
        type="file"
        accept={CONSTITUTION_ACCEPT}
        onChange={onPicked}
        hidden
        aria-label={`${forumName} constitution file`}
      />

      {uploading ? (
        <div className="frm-const-uploading" role="status">
          <div className="frm-const-file">
            <span className="frm-const-name">{uploading.name}</span>
            <span className="frm-person-meta">Uploading {Math.round(uploading.progress * 100)}%</span>
          </div>
          <div className="frm-const-bar">
            <div style={{ width: `${Math.round(uploading.progress * 100)}%` }} />
          </div>
        </div>
      ) : current ? (
        <div className="frm-const-current">
          <div className="frm-const-file">
            <span className="frm-const-name">{current.fileName}</span>
            <span className="frm-person-meta">
              Uploaded{" "}
              {new Date(current.uploadedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: CHAPTER_TIME_ZONE,
              })}
              {current.uploadedByName ? ` by ${current.uploadedByName}` : ""}
            </span>
          </div>
          <div className="frm-const-actions">
            <a className="admin-btn admin-btn--primary" href={`/board/forum/${forumId}/constitution`}>
              Download
            </a>
            <button type="button" className="admin-btn admin-btn--ghost" disabled={busy} onClick={choose}>
              Replace
            </button>
            <button type="button" className="admin-btn admin-btn--danger" disabled={busy} onClick={remove}>
              {deleting ? "Deleting" : "Delete"}
            </button>
          </div>
        </div>
      ) : (
        <div className="frm-const-drop">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="frm-const-drop-title">No constitution uploaded yet</div>
          <div className="frm-person-meta">Drag the file here, or</div>
          <button type="button" className="admin-btn admin-btn--primary" onClick={choose}>
            Choose a file to upload
          </button>
          <div className="frm-person-meta">PDF or Word, up to 20 MB</div>
        </div>
      )}

      {current && !uploading && (
        <div className="frm-person-meta">To replace it, press Replace or drag a new file onto this box.</div>
      )}
      {error && (
        <div className="admin-banner admin-banner--err" role="alert" style={{ marginBottom: 0 }}>
          {error}
        </div>
      )}
    </section>
  );
}
