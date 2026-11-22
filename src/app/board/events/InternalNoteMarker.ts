import {
  createElement,
  useId,
  useReducer,
  type ReactElement,
} from "react";
import { COMPLIMENTARY_POLICY_PREFIX } from "../../../lib/complimentary-rsvp.ts";

type DisclosureState = { focused: boolean; hovered: boolean };
type DisclosureAction =
  | "focus"
  | "blur"
  | "enter"
  | "leave"
  | "dismiss"
  | "toggle-focus";

export function internalNoteDisclosureReducer(
  state: DisclosureState,
  action: DisclosureAction,
): DisclosureState {
  switch (action) {
    case "focus":
      return { ...state, focused: true };
    case "blur":
      return { ...state, focused: false };
    case "enter":
      return { ...state, hovered: true };
    case "leave":
      return { ...state, hovered: false };
    case "dismiss":
      return { focused: false, hovered: false };
    case "toggle-focus":
      return { focused: !state.focused, hovered: false };
  }
}

export function internalNoteDisplayText(note: string): string {
  const lines = note.split(/\r?\n/);
  const hasComplimentaryAudit = lines.some((line) =>
    line.startsWith(COMPLIMENTARY_POLICY_PREFIX),
  );
  if (!hasComplimentaryAudit) return note;

  let sponsor: string | null = null;
  const humanNotes: string[] = [];

  for (const line of lines) {
    if (line.startsWith(COMPLIMENTARY_POLICY_PREFIX)) {
      continue;
    }

    const sponsorAudit = line.match(
      /^Complimentary invite sponsored by (.+)\. No-show policy acknowledged by sponsoring EO member \1\.$/,
    );
    if (sponsorAudit) {
      sponsor = sponsorAudit[1];
      continue;
    }

    humanNotes.push(line);
  }

  return [
    "Complimentary guest",
    sponsor ? `Sponsor: ${sponsor}` : null,
    "No-show policy acknowledged",
    ...humanNotes,
  ].filter((line): line is string => line !== null).join("\n");
}

export function InternalNoteMarker({ note }: { note: string | null }): ReactElement | null {
  const tooltipId = useId();
  const [state, dispatch] = useReducer(internalNoteDisclosureReducer, {
    focused: false,
    hovered: false,
  });
  if (!note) return null;

  const open = state.focused || state.hovered;
  const displayNote = internalNoteDisplayText(note);

  return createElement(
    "span",
    {
      className: `admin-note-disclosure${open ? " is-open" : ""}`,
      onMouseEnter: () => dispatch("enter"),
      onMouseLeave: () => dispatch("leave"),
    },
    createElement(
      "button",
      {
        type: "button",
        className: "admin-note-marker",
        "aria-label": "Internal note",
        "aria-describedby": tooltipId,
        onFocus: () => dispatch("focus"),
        onBlur: () => dispatch("blur"),
        onKeyDown: (event) => {
          if (event.key === "Escape") dispatch("dismiss");
        },
        onPointerDown: (event) => {
          event.currentTarget.dataset.wasFocused = String(
            event.currentTarget.ownerDocument.activeElement === event.currentTarget,
          );
        },
        onClick: (event) => {
          if (event.currentTarget.dataset.wasFocused === "true") dispatch("toggle-focus");
          else dispatch("focus");
          delete event.currentTarget.dataset.wasFocused;
          event.currentTarget.focus();
        },
      },
      "Note",
    ),
    createElement(
      "span",
      {
        id: tooltipId,
        role: "tooltip",
        className: "admin-note-tooltip",
        "aria-hidden": !open,
      },
      displayNote,
    ),
  );
}
