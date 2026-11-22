"use client";

import { useState, useTransition } from "react";
import type { EventMaterial, MaterialKind } from "@/lib/events";
import { addMaterial, deleteMaterial } from "./actions";

const KIND_LABEL: Record<MaterialKind, string> = {
  slides: "Slides",
  recording: "Recording",
  handout: "Handout",
  cert: "Certificate",
  photos: "Photos",
  recap: "Recap",
};

const KIND_ORDER: MaterialKind[] = [
  "slides",
  "recording",
  "handout",
  "recap",
  "photos",
  "cert",
];

const VISIBILITY_LABEL = {
  registered: "Registered attendees",
  attended: "Confirmed attendees only",
  all: "Anyone with the link",
};

type Props = {
  eventId: string;
  materials: EventMaterial[];
};

export function MaterialsSection({ eventId, materials }: Props) {
  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2 className="admin-section-h2">Materials ({materials.length})</h2>
      </div>
      <p className="admin-section-desc">
        Slides, recordings, handouts, recap posts, photos. Visibility controls who can see each item once we wire member auth.
      </p>

      <AddMaterialForm eventId={eventId} />

      {materials.length === 0 ? (
        <div className="admin-stub" style={{ marginTop: 16 }}>
          No materials uploaded yet.
        </div>
      ) : (
        <div className="admin-table-wrap" style={{ marginTop: 16 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Kind</th>
                <th>Visibility</th>
                <th>Link</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <MaterialRow key={m.id} eventId={eventId} material={m} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AddMaterialForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        className="admin-btn admin-btn--ghost"
        onClick={() => setOpen(true)}
      >
        Add material
      </button>
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addMaterial(eventId, formData);
      if (res.ok) {
        setOpen(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="admin-card admin-rsvp-add">
      {error && <div className="admin-banner admin-banner--err">{error}</div>}
      <div className="admin-form-row admin-form-row--2">
        <label className="admin-field">
          <span className="admin-label">Title</span>
          <input name="title" type="text" required placeholder="Session slides, recording, etc." />
        </label>
        <label className="admin-field">
          <span className="admin-label">Kind</span>
          <select name="kind" required defaultValue="slides">
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>{KIND_LABEL[k]}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-form-row admin-form-row--2">
        <label className="admin-field">
          <span className="admin-label">URL</span>
          <input
            name="url"
            type="url"
            required
            placeholder="https://drive.google.com/... or https://youtube.com/..."
          />
        </label>
        <label className="admin-field">
          <span className="admin-label">Visible to</span>
          <select name="visible_to" defaultValue="registered">
            <option value="registered">{VISIBILITY_LABEL.registered}</option>
            <option value="attended">{VISIBILITY_LABEL.attended}</option>
            <option value="all">{VISIBILITY_LABEL.all}</option>
          </select>
        </label>
      </div>
      <div className="admin-form-actions">
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={() => { setOpen(false); setError(null); }}
        >
          Cancel
        </button>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={pending}>
          {pending ? "Adding..." : "Add material"}
        </button>
      </div>
    </form>
  );
}

function MaterialRow({ eventId, material }: { eventId: string; material: EventMaterial }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!confirm(`Remove "${material.title}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMaterial(material.id, eventId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <>
      <tr>
        <td><strong>{material.title}</strong></td>
        <td className="admin-table-meta">{KIND_LABEL[material.kind]}</td>
        <td className="admin-table-meta">{VISIBILITY_LABEL[material.visible_to]}</td>
        <td>
          <a href={material.url} target="_blank" rel="noreferrer" className="admin-link-action">
            Open ↗
          </a>
        </td>
        <td>
          <button
            type="button"
            className="admin-link-action admin-link-action--danger"
            onClick={remove}
            disabled={pending}
          >
            Remove
          </button>
        </td>
      </tr>
      {error && (
        <tr><td colSpan={5}><div className="admin-banner admin-banner--err">{error}</div></td></tr>
      )}
    </>
  );
}
