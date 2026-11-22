// Server-only. The connector's membership tools: prospects and onboarding
// (MCP.2). Plan: docs/plans/13-board-mcp.html.
//
// Reads mirror the Prospects cockpit (src/lib/prospect-pipeline.ts: Contact
// next and Clear out); writes call the same data functions the page's actions
// call (src/lib/deals.ts), after the connector's own check that the caller
// writes the "membership" area (board Membership portfolio, President, super
// admin). Closed Won stays on the website: it starts the onboarding handoff.
// Company revenue is never returned.
//
// Data modules load lazily, inside each tool's body, so this file can be
// imported by the unit tests without a database.
import { z } from "zod";
import {
  clearOut,
  daysBetween,
  priorityQueue,
  prospectScoreboard,
  prospectSignals,
  type ProspectDeal,
} from "../prospect-pipeline.ts";
import type { McpCaller } from "./caller";
import { NO_INPUT, untrusted, writeTool, type Tool } from "./tools-core.ts";

const dealsData = () => import("../deals");
const notesData = () => import("../deal-notes");
const today = async () => (await import("../access-grants")).vnToday();
const revalidate = async (...paths: string[]) => {
  const { revalidatePath } = await import("next/cache");
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      // Outside a request there is nothing to revalidate.
    }
  }
};

const PROSPECTS_PAGE = "/board/prospects";
const ONBOARDING_PAGE = "/board/onboarding";
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-21");
const ID = z.string().uuid("Use the dealId from prospects_contact_next, prospects_clear_out or prospect");

// Open Member Acquisition stages a prospect can be moved between here.
// Closed Won (the onboarding handoff) and Closed Lost (prospects_close_lost)
// are left out on purpose.
const MOVE_STAGES = [
  "Connect & Qualify",
  "Experience EO",
  "Go <> No Go Call",
  "Revenue Verification Sent",
  "Interview",
  "Payment Request",
] as const;

const ONBOARDING_STAGES = [
  "Welcome Email",
  "President's Call",
  "Awaiting Forum Training",
  "Forum Trained",
  "Forum Placed",
  "Active Member",
] as const;

// The closed-lost reasons the website offers (src/lib/deals.ts
// CLOSED_LOST_DESCRIPTIONS), kept here so this file loads without a database.
const CLOSE_REASONS = [
  "Process Stalled / Ghosted",
  "Not Qualified",
  "Timing",
  "Bad Timing",
  "Too Busy / No Bandwidth",
  "Value Not Clear",
  "Price / Dues Objection",
  "Forum Commitment Concern",
  "Confidentiality / Trust Concern",
  "Already in Another Peer Group",
  "Chapter Fit Misalignment",
  "Decision Maker Not Engaged",
  "Geography / Language Barrier",
  "Chose Different Option",
  "Other (Specify in Notes)",
] as const;

type Card = Awaited<ReturnType<Awaited<ReturnType<typeof dealsData>>["getDealById"]>> & {};

function personName(c: Card): string {
  const p = c.person;
  const n = p ? [p.first_name, p.last_name].filter(Boolean).join(" ").trim() : "";
  return n || c.deal.name;
}

function toProspect(c: Card): ProspectDeal {
  return {
    id: c.deal.id,
    name: personName(c),
    stage: c.deal.stage,
    deal_status: c.deal.deal_status,
    close_date: c.deal.close_date,
    channel_source: c.deal.channel_source,
    last_activity_at: c.deal.last_activity_at,
    created_at: c.deal.created_at,
    person_id: c.deal.person_id,
  };
}

function dayLabel(d: string): string {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** The current FY's Member Acquisition deals, their event touches and today, as the cockpit reads them. */
async function cockpit() {
  const [{ getDealsByPipeline, getProspectEventTouches, getNewMemberTarget }, fy, day] = await Promise.all([
    dealsData(),
    import("../fiscal-year"),
    today(),
  ]);
  const fyStart = fy.currentFyStart();
  const [cards, target] = await Promise.all([
    getDealsByPipeline("Member Acquisition", { fyStart }),
    getNewMemberTarget(),
  ]);
  const deals = cards.map(toProspect);
  const touches = await getProspectEventTouches(
    cards.filter((c) => c.deal.deal_status === "open" && c.deal.person_id).map((c) => c.deal.person_id!),
  );
  return { cards, deals, touches, day, target, fyWindow: fy.fyWindow(fyStart), fyLabel: fy.fyLabel(fyStart) };
}

async function openProspect(dealId: string): Promise<Card | { error: string }> {
  const card = await (await dealsData()).getDealById(dealId);
  if (!card || card.deal.pipeline !== "Member Acquisition") return { error: "Prospect not found." };
  if (card.deal.deal_status !== "open") return { error: `${personName(card)} is already closed.` };
  return card;
}

export function membershipTools(caller: McpCaller, origin: string): Tool[] {
  const row = (c: Card | undefined, d: ProspectDeal, lastTouchDay: string, day: string) => ({
    dealId: d.id,
    name: d.name,
    company: c?.company?.name ?? null,
    stage: d.stage,
    phone: c?.person?.phone ?? null,
    email: c?.person?.email ?? null,
    relationshipManager: c?.manager ? [c.manager.first_name, c.manager.last_name].filter(Boolean).join(" ") : null,
    lastTouch: lastTouchDay,
    daysSinceTouch: daysBetween(lastTouchDay, day),
    url: `${origin}${PROSPECTS_PAGE}/${d.id}`,
  });

  const reads: Tool[] = [
    {
      name: "prospects_contact_next",
      area: "membership",
      title: "Prospects: who to contact next",
      description:
        "Open membership prospects worth a call now, highest priority first (stage, recent or upcoming events, referrals), with " +
        "why and how to reach them. Leaves out dead leads and anyone contacted in the last 3 days. Also returns the FY scoreboard.",
      readOnly: true,
      input: z.object({ limit: z.number().int().min(1).max(50).optional() }).passthrough(),
      inputJsonSchema: {
        type: "object",
        properties: { limit: { type: "integer", minimum: 1, maximum: 50, description: "Default 10." } },
      },
      run: async (input) => {
        const c = await cockpit();
        const byId = new Map(c.cards.map((x) => [x.deal.id, x]));
        const queue = priorityQueue(c.deals, c.touches, c.day);
        return {
          today: c.day,
          fiscalYear: c.fyLabel,
          scoreboard: prospectScoreboard(c.deals, c.touches, c.fyWindow, c.target, c.day),
          totalToContact: queue.length,
          contactNext: queue.slice(0, (input.limit as number | undefined) ?? 10).map((q) => ({
            ...row(byId.get(q.deal.id), q.deal, q.signals.lastTouchDay, c.day),
            why: q.reasons.map((r) => r.text),
            score: q.score,
          })),
        };
      },
    },
    {
      name: "prospects_clear_out",
      area: "membership",
      title: "Prospects: dead leads to clear out",
      description:
        "Open prospects with no touch in 90+ days and no upcoming event: candidates to close as lost (Ghosted) with " +
        "prospects_close_lost. Quietest first.",
      readOnly: true,
      ...NO_INPUT,
      run: async () => {
        const c = await cockpit();
        const byId = new Map(c.cards.map((x) => [x.deal.id, x]));
        const dead = clearOut(c.deals, c.touches, c.day);
        return { today: c.day, count: dead.length, deadLeads: dead.map((d) => row(byId.get(d.deal.id), d.deal, d.signals.lastTouchDay, c.day)) };
      },
    },
    {
      name: "prospect",
      area: "membership",
      title: "Prospects: one prospect",
      description:
        "One membership prospect or onboarding card in full: contact details, stage, qualification answers, events attended or " +
        "coming up, and the meeting notes timeline. Give the dealId, or a name or company to search.",
      readOnly: true,
      input: z.object({ dealId: ID.optional(), search: z.string().trim().min(2).max(100).optional() }).passthrough(),
      inputJsonSchema: {
        type: "object",
        properties: {
          dealId: { type: "string" },
          search: { type: "string", description: "Part of the person's name, email or company." },
        },
      },
      run: async (input) => {
        const { getDealById, getDealsByPipeline, getProspectEventTouches } = await dealsData();
        let dealId = input.dealId as string | undefined;
        if (!dealId) {
          const q = String(input.search ?? "").trim();
          if (!q) return { error: "Give a dealId or a name to search." };
          const [acq, onb] = await Promise.all([
            getDealsByPipeline("Member Acquisition", { q }),
            getDealsByPipeline("Onboarding Track", { q }),
          ]);
          const all = [...acq, ...onb];
          if (all.length === 0) return { error: `No prospect matches "${q}".` };
          if (all.length > 1) {
            return {
              matches: all.slice(0, 20).map((x) => ({
                dealId: x.deal.id,
                name: personName(x),
                company: x.company?.name ?? null,
                pipeline: x.deal.pipeline,
                stage: x.deal.stage,
              })),
              next: "Several match. Ask which one, then call again with its dealId.",
            };
          }
          dealId = all[0].deal.id;
        }
        const card = await getDealById(dealId);
        if (!card) return { error: "Prospect not found." };
        const day = await today();
        const touches = card.deal.person_id ? await getProspectEventTouches([card.deal.person_id]) : [];
        const signals = prospectSignals(toProspect(card), touches, day);
        const notes = await (await notesData()).listDealNotes("prospect", card.deal.id);
        const page = card.deal.pipeline === "Onboarding Track" ? ONBOARDING_PAGE : PROSPECTS_PAGE;
        return {
          dealId: card.deal.id,
          name: personName(card),
          email: card.person?.email ?? null,
          phone: card.person?.phone ?? null,
          city: card.person?.city ?? null,
          company: card.company?.name ?? null,
          industry: card.company?.industry ?? null,
          pipeline: card.deal.pipeline,
          stage: card.deal.stage,
          status: card.deal.deal_status,
          source: card.deal.channel_source,
          interest: card.deal.primary_interest,
          relationshipManager: card.manager ? [card.manager.first_name, card.manager.last_name].filter(Boolean).join(" ") : null,
          qualification: {
            founderOrControllingOwner: card.deal.ql_founder_controlling_owner,
            revenueVerified: card.deal.ql_revenue_verified,
            financialCommitment: card.deal.ql_financial_commitment,
            timeCommitment: card.deal.ql_time_commitment,
          },
          lastActivity: card.deal.last_activity_at,
          lastTouch: signals.lastTouchDay,
          daysSinceTouch: signals.daysSinceTouch,
          eventsAttended: signals.attendedCount,
          lastAttended: signals.lastAttended,
          upcomingEvent: signals.upcoming,
          closedLostReason: card.deal.closed_lost_description,
          description: untrusted(card.deal.description),
          meetingNotes: notes.map((n) => ({
            metOn: n.met_on,
            title: untrusted(n.title),
            body: untrusted(n.body),
            nextStep: untrusted(n.next_step),
            by: n.author,
          })),
          url: `${origin}${page}/${card.deal.id}`,
        };
      },
    },
    {
      name: "onboarding",
      area: "membership",
      title: "Onboarding: new members by stage",
      description: "New members on the Onboarding Track, grouped by stage (Welcome Email through Active Member), with days in stage.",
      readOnly: true,
      ...NO_INPUT,
      run: async () => {
        const { getDealsByPipeline, daysInStage } = await dealsData();
        const cards = await getDealsByPipeline("Onboarding Track");
        return {
          stages: ONBOARDING_STAGES.map((stage) => ({
            stage,
            members: cards
              .filter((c) => c.deal.stage === stage)
              .map((c) => ({
                dealId: c.deal.id,
                name: personName(c),
                company: c.company?.name ?? null,
                daysInStage: daysInStage(c.deal),
                url: `${origin}${ONBOARDING_PAGE}/${c.deal.id}`,
              })),
          })),
        };
      },
    },
  ];

  const writes: Tool[] = [
    writeTool(caller, {
      name: "prospects_log_contact",
      area: "membership",
      title: "Prospects: log a contact",
      description: "Records that a prospect was contacted just now, so they drop off Contact next for a few days.",
      input: z.object({ dealId: ID }),
      properties: { dealId: { type: "string" } },
      required: ["dealId"],
      plan: async (f) => {
        const card = await openProspect(f.dealId);
        if ("error" in card) return card;
        return { summary: `${personName(card)}: contacted today`, warnings: [] };
      },
      apply: async (f) => {
        await (await dealsData()).updateDeal(f.dealId, { last_activity_at: new Date().toISOString() });
        await revalidate(PROSPECTS_PAGE, `${PROSPECTS_PAGE}/${f.dealId}`);
      },
    }),
    writeTool(caller, {
      name: "prospects_move_stage",
      area: "membership",
      title: "Prospects: move to another stage",
      description:
        "Moves an open prospect to another open stage. Closing as won stays on the website (it starts onboarding); to close as " +
        "lost use prospects_close_lost.",
      input: z.object({ dealId: ID, stage: z.enum(MOVE_STAGES) }),
      properties: { dealId: { type: "string" }, stage: { type: "string", enum: [...MOVE_STAGES] } },
      required: ["dealId", "stage"],
      plan: async (f) => {
        const card = await openProspect(f.dealId);
        if ("error" in card) return card;
        if (card.deal.stage === f.stage) return { error: `${personName(card)} is already in ${f.stage}.` };
        const back = MOVE_STAGES.indexOf(f.stage) < MOVE_STAGES.indexOf(card.deal.stage as (typeof MOVE_STAGES)[number]);
        return {
          summary: `${personName(card)}: ${card.deal.stage} → ${f.stage}`,
          warnings: back ? ["This moves the prospect back to an earlier stage."] : [],
        };
      },
      apply: async (f) => {
        await (await dealsData()).updateDeal(f.dealId, { stage: f.stage, last_activity_at: new Date().toISOString() });
        await revalidate(PROSPECTS_PAGE, `${PROSPECTS_PAGE}/${f.dealId}`);
      },
    }),
    writeTool(caller, {
      name: "prospects_close_lost",
      area: "membership",
      title: "Prospects: close as lost",
      description:
        "Closes one or more open prospects as lost with a reason (default Process Stalled / Ghosted), for example the Clear out list.",
      destructive: true,
      input: z.object({
        dealIds: z.array(ID).min(1).max(50),
        reason: z.enum(CLOSE_REASONS).optional(),
        detail: z.string().trim().max(500).optional(),
      }),
      properties: {
        dealIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 50 },
        reason: { type: "string", enum: [...CLOSE_REASONS], description: "Default Process Stalled / Ghosted." },
        detail: { type: "string", description: "Optional note on why." },
      },
      required: ["dealIds"],
      plan: async (f) => {
        const ids = [...new Set(f.dealIds)];
        const cards = await Promise.all(ids.map(openProspect));
        const bad = cards.flatMap((c, i) => ("error" in c ? [`${ids[i]}: ${c.error}`] : []));
        if (bad.length) return { error: `Nothing was closed. ${bad.join(" ")}` };
        const ok = cards as Card[];
        const reason = f.reason ?? "Process Stalled / Ghosted";
        const names = ok.map(personName);
        return {
          summary: `Close ${ok.length} prospect${ok.length === 1 ? "" : "s"} as lost (${reason}): ${names.join(", ")}`,
          warnings: [
            ok.length > 1
              ? `This closes ${ok.length} prospects as lost. Reopening them is done one by one on the website.`
              : "This closes the prospect as lost. Reopening is done on the website.",
          ],
        };
      },
      apply: async (f) => {
        const { updateDeal } = await dealsData();
        const now = new Date().toISOString();
        for (const id of new Set(f.dealIds)) {
          await updateDeal(id, {
            stage: "Closed Lost",
            deal_status: "closed_lost",
            close_date: now,
            closed_lost_description: f.reason ?? "Process Stalled / Ghosted",
            ...(f.detail ? { closed_lost_reason: f.detail } : {}),
            last_activity_at: now,
          });
        }
        await revalidate(PROSPECTS_PAGE);
      },
    }),
    writeTool(caller, {
      name: "prospects_add_note",
      area: "membership",
      title: "Prospects: log a meeting note",
      description: "Adds a meeting or call note to a prospect's (or onboarding member's) timeline and counts it as a contact.",
      input: z.object({
        dealId: ID,
        body: z.string().trim().min(1).max(20000),
        title: z.string().trim().max(200).optional(),
        metOn: DAY.optional(),
        nextStep: z.string().trim().max(500).optional(),
      }),
      properties: {
        dealId: { type: "string" },
        body: { type: "string", description: "The notes: what was discussed, what was agreed." },
        title: { type: "string" },
        metOn: { type: "string", description: "Meeting date, YYYY-MM-DD. Defaults to today." },
        nextStep: { type: "string" },
      },
      required: ["dealId", "body"],
      plan: async (f) => {
        const card = await (await dealsData()).getDealById(f.dealId);
        if (!card) return { error: "Prospect not found." };
        const day = await today();
        const on = f.metOn ?? day;
        if (on > day) return { error: "A meeting note can't be dated in the future." };
        return {
          summary: `${personName(card)}: note "${f.title ?? f.body.slice(0, 60)}" from ${dayLabel(on)}${f.nextStep ? `, next step "${f.nextStep}"` : ""}`,
          warnings: [],
        };
      },
      apply: async (f) => {
        const { getDealById, updateDeal } = await dealsData();
        const card = await getDealById(f.dealId);
        const on = f.metOn ?? (await today());
        const note = await (await notesData()).addDealNote({
          kind: "prospect",
          dealId: f.dealId,
          authorProfileId: caller.user.id,
          metOn: on,
          title: f.title ?? null,
          body: f.body,
          nextStep: f.nextStep ?? null,
          source: "connector",
        });
        const last = card?.deal.last_activity_at?.slice(0, 10) ?? null;
        if (card?.deal.deal_status === "open" && (!last || last < on)) {
          await updateDeal(f.dealId, { last_activity_at: on === (await today()) ? new Date().toISOString() : `${on}T09:00:00+07:00` });
        }
        const page = card?.deal.pipeline === "Onboarding Track" ? ONBOARDING_PAGE : PROSPECTS_PAGE;
        await revalidate(page, `${page}/${f.dealId}`);
        return note;
      },
    }),
    writeTool(caller, {
      name: "onboarding_move_stage",
      area: "membership",
      title: "Onboarding: move a new member to another stage",
      description: "Moves a new member on the Onboarding Track to another stage (Welcome Email through Active Member).",
      input: z.object({ dealId: ID, stage: z.enum(ONBOARDING_STAGES) }),
      properties: { dealId: { type: "string" }, stage: { type: "string", enum: [...ONBOARDING_STAGES] } },
      required: ["dealId", "stage"],
      plan: async (f) => {
        const card = await (await dealsData()).getDealById(f.dealId);
        if (!card || card.deal.pipeline !== "Onboarding Track") return { error: "Onboarding card not found." };
        if (card.deal.stage === f.stage) return { error: `${personName(card)} is already in ${f.stage}.` };
        const back = ONBOARDING_STAGES.indexOf(f.stage) < ONBOARDING_STAGES.indexOf(card.deal.stage as (typeof ONBOARDING_STAGES)[number]);
        return {
          summary: `${personName(card)}: ${card.deal.stage} → ${f.stage}`,
          warnings: back ? ["This moves the member back to an earlier onboarding stage."] : [],
        };
      },
      apply: async (f) => {
        await (await dealsData()).updateDeal(f.dealId, { stage: f.stage, last_activity_at: new Date().toISOString() });
        await revalidate(ONBOARDING_PAGE, `${ONBOARDING_PAGE}/${f.dealId}`);
      },
    }),
  ];

  return [...reads, ...writes];
}
