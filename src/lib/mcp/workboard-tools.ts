// Server-only. The connector's workboard tools: see the boards you can add to,
// and add a card (MCP.3). Plan: docs/plans/13-board-mcp.html.
//
// Adding a card calls the same insertCard the website's "+ Add a card" calls
// (src/entities/boards/lib/create-card.ts), after the same board check the
// website makes (connectorActorFor mirrors boardActorFor). Area "me", beside
// my_commitments and card_update (./own-tools.ts): every level gets them, and
// the board check decides where a card may go.
//
// Data modules load lazily, inside each tool's body, so this file can be
// imported by the unit tests without a database.
import { z } from "zod";
import type { McpCaller } from "./caller";
import { NO_INPUT, writeTool, type Tool } from "./tools-core.ts";

const boardsData = () => import("@/entities/boards/lib/connector");
const createData = () => import("@/entities/boards/lib/create-card");

const PRIORITIES = ["p1", "p2", "p3"] as const;
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-21");

const addCardInput = z.object({
  board: z.string().trim().min(1, "Name the board by its slug from my_boards"),
  title: z.string().trim().min(1, "Give the card a title").max(300),
  column: z.string().trim().max(80).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: DAY.optional(),
  description: z.string().trim().max(5000).optional(),
  assignToMe: z.boolean().optional(),
});
type AddCard = z.infer<typeof addCardInput>;

function dayLabel(d: string): string {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function workboardTools(caller: McpCaller): Tool[] {
  const personId = caller.user.personId;
  const person = personId ? { personId, label: caller.user.fullName ?? caller.user.email, isAdmin: caller.user.role === "super_admin" } : null;

  /** The board and column a call names, or why it cannot be used. */
  async function resolve(f: AddCard) {
    if (!person) return { error: "Your sign-in is not linked to a person record, so cards cannot be added for you." };
    const { connectorBoards } = await boardsData();
    const boards = await connectorBoards(person);
    const key = f.board.toLowerCase();
    const board = boards.find((b) => b.slug.toLowerCase() === key || b.name.toLowerCase() === key || b.id === f.board);
    if (!board) return { error: `No board "${f.board}" that you can add cards to. Call my_boards for the list.` };
    const column = f.column
      ? board.columns.find((c) => c.name.toLowerCase() === f.column!.toLowerCase())
      : board.columns.find((c) => !c.isDone);
    if (!column) {
      return { error: `${board.name} has no "${f.column ?? "open"}" column. Its columns: ${board.columns.map((c) => c.name).join(", ")}.` };
    }
    return { board, column };
  }

  return [
    {
      name: "my_boards",
      area: "me",
      title: "My cards: boards I can add to",
      description:
        "The workboards you can add cards to, each with its slug and its columns in order. " +
        "Use a slug and a column name with card_add.",
      readOnly: true,
      ...NO_INPUT,
      run: async () => {
        if (!person) return { boards: [], note: "Your sign-in is not linked to a person record." };
        const { connectorBoards } = await boardsData();
        const boards = await connectorBoards(person);
        return { boards: boards.map((b) => ({ name: b.name, slug: b.slug, columns: b.columns.map((c) => c.name) })) };
      },
    },
    writeTool(caller, {
      name: "card_add",
      area: "me",
      title: "My cards: add a card",
      description:
        "Adds a card to one of your workboards. By default it goes in the board's first open column (usually To do), " +
        "priority P3, assigned to you so it shows under My cards on My Commitments. Set assignToMe to false to leave it unassigned.",
      input: addCardInput,
      properties: {
        board: { type: "string", description: "The board's slug (or exact name) from my_boards." },
        title: { type: "string", description: "The card's title, one line." },
        column: { type: "string", description: "Column name, e.g. To do or Doing. Defaults to the first open column." },
        priority: { type: "string", enum: [...PRIORITIES], description: "p1 (highest) to p3. Defaults to p3." },
        dueDate: { type: "string", description: "Due date as YYYY-MM-DD." },
        description: { type: "string", description: "Longer notes for the card." },
        assignToMe: { type: "boolean", description: "Assign the card to you. Defaults to true." },
      },
      required: ["board", "title"],
      plan: async (f) => {
        const r = await resolve(f);
        if ("error" in r) return { error: r.error! };
        const mine = f.assignToMe !== false;
        const bits = [
          `${r.board.name} · ${r.column.name}`,
          (f.priority ?? "p3").toUpperCase(),
          mine ? "assigned to you" : "unassigned",
          ...(f.dueDate ? [`due ${dayLabel(f.dueDate)}`] : []),
        ];
        return {
          summary: `New card "${f.title}": ${bits.join(", ")}`,
          warnings: r.column.isDone ? [`${r.column.name} is a done column, so the card will be made already finished.`] : [],
        };
      },
      apply: async (f) => {
        const r = await resolve(f);
        if ("error" in r) throw new Error(r.error);
        const { connectorActorFor } = await boardsData();
        const actor = await connectorActorFor(r.board.id, person!);
        if (!actor) throw new Error("You can't add cards to that board.");
        const { insertCard } = await createData();
        const created = await insertCard(actor, {
          boardId: r.board.id,
          columnId: r.column.id,
          title: f.title,
          priority: f.priority,
          assigneeId: f.assignToMe !== false ? person!.personId : undefined,
          dueDate: f.dueDate,
          description: f.description,
        });
        if (!created.ok) throw new Error(created.id ? `Card ${created.id} was made, but: ${created.error}` : created.error);
        return { cardId: created.id, board: r.board.slug, column: r.column.name };
      },
    }),
  ];
}
