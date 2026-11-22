"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

// The event detail page is an operations console: one tabbed surface where the
// Chapter Manager / Learning Chair / myEO Chair read the data, manage the event,
// and message participants without jumping between pages. Panels are rendered
// server-side and handed in as props; this client shell only switches which one
// is visible and lets any panel deep-link to another tab via <TabLink>.

export type TabKey =
  | "overview"
  | "people"
  | "feedback"
  | "messages"
  | "settings";

const LOCAL_EVENT_TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "people", label: "People" },
  { key: "feedback", label: "Feedback" },
  { key: "messages", label: "Messages" },
  { key: "settings", label: "Settings" },
];

const GLOBAL_EVENT_TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "people", label: "People" },
  { key: "settings", label: "Settings" },
];

const TabContext = createContext<{ setTab: (t: TabKey) => void } | null>(null);

// A button that switches the active tab from inside a panel (e.g. the Overview
// "Message participants" action jumping to the Messages tab).
export function TabLink({
  tab,
  className,
  children,
}: {
  tab: TabKey;
  className?: string;
  children: ReactNode;
}) {
  const ctx = useContext(TabContext);
  return (
    <button type="button" className={className} onClick={() => ctx?.setTab(tab)}>
      {children}
    </button>
  );
}

type Counts = Partial<Record<TabKey, number>>;

export function EventTabs({
  panels,
  counts,
  initialTab = "overview",
  variant = "local",
}: {
  panels: Partial<Record<TabKey, ReactNode>>;
  counts?: Counts;
  initialTab?: TabKey;
  variant?: "local" | "global";
}) {
  const [active, setActive] = useState<TabKey>(initialTab);
  const tabs = variant === "global" ? GLOBAL_EVENT_TABS : LOCAL_EVENT_TABS;

  return (
    <TabContext.Provider value={{ setTab: setActive }}>
      <div className="hub-tabs" role="tablist" aria-label="Event sections">
        {tabs.map(({ key, label }) => {
          const count = counts?.[key];
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active === key}
              className={`hub-tab${active === key ? " is-active" : ""}`}
              onClick={() => setActive(key)}
            >
              {label}
              {typeof count === "number" && (
                <span className="hub-tab-count">{count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="hub-panel" role="tabpanel">
        {panels[active] ?? panels.overview}
      </div>
    </TabContext.Provider>
  );
}
