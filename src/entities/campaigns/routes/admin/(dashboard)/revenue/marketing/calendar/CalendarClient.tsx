"use client";

import { useState } from "react";
import { DetailDrawer } from "@/kernel/ui/DetailDrawer";
import {
  CHANNEL_LABEL,
  type BrandOption,
  type CalendarEntryRow,
  type PillarOption,
} from "@/entities/campaigns/lib/marketing-calendar-shared";
import type { CampaignOption } from "@/entities/campaigns/lib/marketing-campaigns";
import type { BrandStylePrefs } from "@/entities/campaigns/lib/style-catalogues";
import { NewEntryForm } from "./NewEntryForm";
import { PillarManager } from "./PillarManager";
import { CalendarBoard } from "./CalendarBoard";
import { CalendarMonth } from "./CalendarMonth";
import { EntryDrawer } from "./EntryDrawer";
import { moveEntry } from "./actions";

// Published site posts are read-only cards; clicking one opens the live post.
const isSitePost = (id: string) => id.startsWith("site:");

export function CalendarClient({
  initialEntries,
  brands,
  initialPillars,
  stylePrefs,
  campaigns,
}: {
  initialEntries: CalendarEntryRow[];
  brands: BrandOption[];
  initialPillars: PillarOption[];
  stylePrefs: BrandStylePrefs[];
  campaigns: CampaignOption[];
}) {
  const [entries, setEntries] = useState<CalendarEntryRow[]>(initialEntries);
  const [pillars, setPillars] = useState<PillarOption[]>(initialPillars);
  const [pillarFilter, setPillarFilter] = useState<string | null>(null);
  const [campaignFilter, setCampaignFilter] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [view, setView] = useState<"board" | "calendar">("board");
  const [panel, setPanel] = useState<"new" | "pillars" | null>(null);

  const selected = entries.find((e) => e.id === selectedId) ?? null;
  const planned = entries.filter((e) => !isSitePost(e.id));
  const visible = entries.filter(
    (e) =>
      (!pillarFilter || e.pillarId === pillarFilter) &&
      (!campaignFilter || e.campaignId === campaignFilter),
  );

  function select(id: string) {
    const e = entries.find((x) => x.id === id);
    if (e && isSitePost(id) && e.postedUrl) {
      window.open(e.postedUrl, "_blank", "noopener");
      return;
    }
    setSelectedId(id);
  }

  function move(id: string, status: string) {
    if (isSitePost(id)) return;
    const prev = entries;
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, status: status as CalendarEntryRow["status"] } : e)));
    setBanner(null);
    moveEntry(id, status).then((r) => {
      if (!r.ok) {
        setEntries(prev);
        setBanner({ ok: false, text: `Couldn't move: ${r.error}` });
      }
    });
  }

  function patch(id: string, partial: Partial<CalendarEntryRow>) {
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...partial } : e)));
  }

  function remove(id: string) {
    setEntries((es) => es.filter((e) => e.id !== id));
    setSelectedId(null);
  }


  function add(entry: CalendarEntryRow) {
    setEntries((es) => [...es, entry]);
  }

  function replaceAll(next: CalendarEntryRow[]) {
    setEntries(next);
  }

  function addPillar(p: PillarOption) {
    setPillars((ps) => [...ps, p]);
  }

  function removePillar(id: string) {
    setPillars((ps) => ps.filter((p) => p.id !== id));
    if (pillarFilter === id) setPillarFilter(null);
  }

  return (
    <>
      {banner && (
        <div className={`admin-alert ${banner.ok ? "admin-alert--ok" : "admin-alert--err"} u-mb-3`}>
          {banner.text}
        </div>
      )}

      <div className="cal-toolbar">
        <div className="cal-filters">
          {pillars.length > 0 && (
            <label className="cal-filter">
              <span>Pillar</span>
              <select className="admin-input" value={pillarFilter ?? ""} onChange={(e) => setPillarFilter(e.target.value || null)}>
                <option value="">All pillars</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}
          {campaigns.length > 0 && (
            <label className="cal-filter">
              <span>Campaign</span>
              <select className="admin-input" value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}>
                <option value="">All campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          )}
          <span className="cal-count">
            {visible.length} {visible.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="cal-actions">
          <div className="admin-viewtoggle" role="tablist">
            {(["board", "calendar"] as const).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "is-active" : ""} onClick={() => setView(v)}>
                {v === "board" ? "Board" : "Calendar"}
              </button>
            ))}
          </div>
          <button type="button" className={`admin-btn${panel === "pillars" ? " is-active" : ""}`} onClick={() => setPanel(panel === "pillars" ? null : "pillars")}>
            Pillars
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setPanel(panel === "new" ? null : "new")}>
            {panel === "new" ? "Close" : "+ New entry"}
          </button>
        </div>
      </div>

      {panel === "new" && (
        <section className="admin-card admin-section-card cal-panel">
          <div className="admin-card-title">New entry</div>
          <NewEntryForm brands={brands} pillars={pillars} onCreated={add} />
        </section>
      )}

      {panel === "pillars" && (
        <section className="admin-card admin-section-card cal-panel">
          <div className="admin-card-title">Content pillars</div>
          <PillarManager brands={brands} pillars={pillars} onCreated={addPillar} onRemoved={removePillar} />
        </section>
      )}

      {planned.length === 0 && panel !== "new" && (
        <div className="cal-empty">
          {entries.length > 0 ? "Published posts are shown; nothing new is planned yet." : "Nothing planned yet."}{" "}
          <button type="button" className="cal-empty-link" onClick={() => setPanel("new")}>Add the first entry</button>
        </div>
      )}

      {view === "board" ? (
        <CalendarBoard entries={visible} onMove={move} onCardClick={select} isLocked={isSitePost} />
      ) : (
        <div className="admin-card admin-section-card">
          <CalendarMonth entries={visible} onSelect={select} />
        </div>
      )}

      <DetailDrawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        eyebrow={selected ? CHANNEL_LABEL[selected.channel] : ""}
        title={selected?.title ?? "Entry"}
      >
        {selected && (
          <EntryDrawer
            entry={selected}
            brands={brands}
            pillars={pillars}
            stylePrefs={stylePrefs}
            allEntries={entries}
            onPatched={patch}
            onDeleted={remove}
            onRepurposed={replaceAll}
          />
        )}
      </DetailDrawer>
    </>
  );
}
