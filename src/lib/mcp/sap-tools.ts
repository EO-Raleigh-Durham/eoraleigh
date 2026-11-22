// Server-only. The connector's SAP pipeline tools (MCP.1). Plan:
// docs/plans/13-board-mcp.html.
//
// Reads mirror the SAP page's cockpit (src/lib/sap-pipeline.ts); writes call
// the same data functions the page's actions call (src/lib/sap.ts), after the
// connector's own check that the caller writes the "sap" area (board SAP
// portfolio, President, super admin, or a contractor with an edit grant).
//
// Data modules load lazily, inside each tool's body, so this file can be
// imported by the unit tests without a database.
import { z } from "zod";
import {
  STAGE_LABEL,
  actionQueue,
  addDays,
  cashOf,
  funnel,
  inKindOf,
  isOpen,
  ownerRollup,
  resolveStage,
  scoreboard,
  type PipelineDeal,
} from "../sap-pipeline.ts";
import type { McpCaller } from "./caller";
import { NO_INPUT, untrusted, writeTool, type Tool } from "./tools-core.ts";

const sapData = () => import("../sap");
const notesData = () => import("../deal-notes");
const today = async () => (await import("../access-grants")).vnToday();
const fyOf = async () => {
  const fy = await import("../fiscal-year");
  return { label: fy.fyLabel(fy.currentFyStart()), window: fy.fyWindow(fy.currentFyStart()) };
};
const revalidate = async (...paths: string[]) => {
  const { revalidatePath } = await import("next/cache");
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      // Outside a request (tests, scripts) there is nothing to revalidate.
    }
  }
};

const SAP_PAGE = "/board/strategic-alliance-partners";
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-21");
const ID = z.string().uuid("Use the dealId from sap_today, sap_pipeline or sap_deal");

type Partner = Awaited<ReturnType<Awaited<ReturnType<typeof sapData>>["getAllSapPartners"]>>[number];

function toPipelineDeal(p: Partner): PipelineDeal {
  return {
    id: p.deal.id,
    companyName: p.company.name,
    status: p.deal.status,
    pipeline_stage: p.deal.pipeline_stage ?? null,
    amount_usd: p.deal.amount_usd ?? 0,
    cash_usd: p.deal.cash_usd ?? null,
    in_kind_usd: p.deal.in_kind_usd ?? null,
    deal_owner: p.deal.deal_owner,
    last_contact_at: p.deal.last_contact_at,
    next_followup_at: p.deal.next_followup_at,
    next_step: p.deal.next_step ?? null,
    closed_won_at: p.deal.closed_won_at,
    created_at: p.deal.created_at,
  };
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function dayLabel(d: string): string {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** The stages a deal can be moved to with sap_update_deal (closing has its own tool). */
const OPEN_STAGES = ["lead", "contacted", "in_discussion", "meeting", "proposal"] as const;
type OpenStage = (typeof OPEN_STAGES)[number];

function stagePatch(stage: OpenStage): { status: "lead" | "in_discussion"; pipeline_stage: "contacted" | "meeting" | "proposal" | null } {
  if (stage === "lead") return { status: "lead", pipeline_stage: null };
  if (stage === "in_discussion") return { status: "in_discussion", pipeline_stage: null };
  return { status: "in_discussion", pipeline_stage: stage };
}

async function loadDeal(dealId: string): Promise<Partner | null> {
  return (await sapData()).getSapPartnerById(dealId);
}

function brief(p: PipelineDeal, origin: string) {
  return {
    dealId: p.id,
    company: p.companyName,
    stage: STAGE_LABEL[resolveStage(p)],
    cash: cashOf(p),
    inKind: inKindOf(p),
    owner: p.deal_owner,
    lastContact: p.last_contact_at,
    nextFollowUp: p.next_followup_at,
    nextStep: untrusted(p.next_step),
    url: `${origin}${SAP_PAGE}/${p.id}`,
  };
}

export function sapTools(caller: McpCaller, origin: string): Tool[] {
  const reads: Tool[] = [
    {
      name: "sap_today",
      area: "sap",
      title: "SAP: what needs a touch",
      description:
        "The Strategic Alliance Partner Today list, most urgent first: overdue follow-ups, follow-ups due within 7 days, " +
        "open deals with no follow-up date, and deals quiet for 30+ days. Answers 'what do I need to do on SAP this week?'.",
      readOnly: true,
      ...NO_INPUT,
      run: async () => {
        const [{ getAllSapPartners }, day] = await Promise.all([sapData(), today()]);
        const deals = (await getAllSapPartners()).map(toPipelineDeal);
        const queue = actionQueue(deals, day);
        const count = (r: string) => queue.filter((q) => q.reason === r).length;
        return {
          today: day,
          counts: {
            overdue: count("overdue"),
            dueThisWeek: count("due_soon"),
            noNextStep: count("no_next_step"),
            quiet30Days: count("stale"),
          },
          items: queue.map((q) => ({
            reason: q.reason,
            days: q.days,
            ...brief(q.deal, origin),
          })),
        };
      },
    },
    {
      name: "sap_pipeline",
      area: "sap",
      title: "SAP: pipeline and scoreboard",
      description:
        "The SAP scoreboard for this fiscal year (cash secured against the target, weighted forecast, coverage), the funnel by stage, " +
        "open deals by owner, and every open deal. Set includeClosed to also list won and lost deals.",
      readOnly: true,
      input: z.object({ includeClosed: z.boolean().optional() }).passthrough(),
      inputJsonSchema: {
        type: "object",
        properties: { includeClosed: { type: "boolean", description: "Also list won and lost deals." } },
      },
      run: async (input) => {
        const [{ getAllSapPartners, getSapCashTarget }, day, fy] = await Promise.all([sapData(), today(), fyOf()]);
        const [partners, target] = await Promise.all([getAllSapPartners(), getSapCashTarget()]);
        const deals = partners.map(toPipelineDeal);
        const listed = input.includeClosed ? deals : deals.filter(isOpen);
        return {
          fiscalYear: fy.label,
          scoreboard: scoreboard(deals, fy.window, target),
          funnel: funnel(deals).map((r) => ({ stage: STAGE_LABEL[r.stage], count: r.count, total: r.total, weight: r.weight })),
          byOwner: ownerRollup(deals, day),
          deals: listed.map((d) => brief(d, origin)),
        };
      },
    },
    {
      name: "sap_deal",
      area: "sap",
      title: "SAP: one deal",
      description:
        "One SAP deal in full: stage, cash and in-kind, owner, dates, next step, partner contacts and the meeting notes timeline. " +
        "Give the dealId, or a company name to search.",
      readOnly: true,
      input: z.object({ dealId: ID.optional(), company: z.string().min(2).max(100).optional() }).passthrough(),
      inputJsonSchema: {
        type: "object",
        properties: {
          dealId: { type: "string", description: "The deal's id." },
          company: { type: "string", description: "Part of the company name, when the id isn't known." },
        },
      },
      run: async (input) => {
        let dealId = input.dealId as string | undefined;
        if (!dealId) {
          const q = String(input.company ?? "").trim().toLowerCase();
          if (!q) return { error: "Give a dealId or a company name." };
          const matches = (await (await sapData()).getAllSapPartners()).filter((p) =>
            p.company.name.toLowerCase().includes(q),
          );
          if (matches.length === 0) return { error: `No SAP deal matches "${input.company}".` };
          if (matches.length > 1) {
            return {
              matches: matches.map((p) => ({ dealId: p.deal.id, company: p.company.name, stage: STAGE_LABEL[resolveStage(toPipelineDeal(p))] })),
              next: "Several deals match. Ask which one, then call again with its dealId.",
            };
          }
          dealId = matches[0].deal.id;
        }
        const p = await loadDeal(dealId);
        if (!p) return { error: "SAP deal not found." };
        const notes = await (await notesData()).listDealNotes("sap", p.deal.id);
        const d = toPipelineDeal(p);
        return {
          ...brief(d, origin),
          status: p.deal.status,
          tier: p.deal.deal_type,
          total: p.deal.amount_usd,
          closedWonOn: p.deal.closed_won_at,
          industry: p.company.industry,
          website: p.company.website,
          introducedBy: untrusted(p.deal.introduced_by),
          discount: untrusted(p.deal.discount_note),
          motivation: untrusted(p.deal.motivation),
          dealNotes: untrusted(p.deal.notes),
          contacts: p.contacts.map((c) => ({ name: c.name, email: c.email, phone: c.phone })),
          meetingNotes: notes.map((n) => ({
            metOn: n.met_on,
            title: untrusted(n.title),
            body: untrusted(n.body),
            nextStep: untrusted(n.next_step),
            by: n.author,
          })),
        };
      },
    },
  ];

  const writes: Tool[] = [
    writeTool(caller, {
      name: "sap_log_contact",
      area: "sap",
      title: "SAP: log a contact",
      description: "Records that the partner was contacted (last contact date), today unless a date is given.",
      input: z.object({ dealId: ID, on: DAY.optional() }),
      properties: {
        dealId: { type: "string" },
        on: { type: "string", description: "The contact date, YYYY-MM-DD. Defaults to today (chapter time)." },
      },
      required: ["dealId"],
      plan: async (f) => {
        const p = await loadDeal(f.dealId);
        if (!p) return { error: "SAP deal not found." };
        const on = f.on ?? (await today());
        if (on > (await today())) return { error: "A contact date can't be in the future." };
        return { summary: `${p.company.name}: last contact ${dayLabel(on)}`, warnings: [] };
      },
      apply: async (f) => {
        await (await sapData()).updateSapDeal(f.dealId, { last_contact_at: f.on ?? (await today()) }, caller.user.id);
        await revalidate(SAP_PAGE, `${SAP_PAGE}/${f.dealId}`);
      },
    }),
    writeTool(caller, {
      name: "sap_snooze",
      area: "sap",
      title: "SAP: push a follow-up back",
      description: "Moves the next follow-up date later by a number of days (default 7), counted from today or the current follow-up, whichever is later.",
      input: z.object({ dealId: ID, days: z.number().int().min(1).max(90).optional() }),
      properties: {
        dealId: { type: "string" },
        days: { type: "integer", minimum: 1, maximum: 90, description: "Default 7." },
      },
      required: ["dealId"],
      plan: async (f) => {
        const p = await loadDeal(f.dealId);
        if (!p) return { error: "SAP deal not found." };
        const day = await today();
        const base = p.deal.next_followup_at && p.deal.next_followup_at > day ? p.deal.next_followup_at : day;
        const next = addDays(base, f.days ?? 7);
        return { summary: `${p.company.name}: next follow-up ${dayLabel(next)}`, warnings: [], details: { nextFollowUp: next } };
      },
      apply: async (f) => {
        const p = await loadDeal(f.dealId);
        const day = await today();
        const base = p?.deal.next_followup_at && p.deal.next_followup_at > day ? p.deal.next_followup_at : day;
        await (await sapData()).updateSapDeal(f.dealId, { next_followup_at: addDays(base, f.days ?? 7) }, caller.user.id);
        await revalidate(SAP_PAGE, `${SAP_PAGE}/${f.dealId}`);
      },
    }),
    writeTool(caller, {
      name: "sap_update_deal",
      area: "sap",
      title: "SAP: update a deal",
      description:
        "Changes an open deal's stage (lead, contacted, in_discussion, meeting, proposal), cash and in-kind value, owner, next step " +
        "or next follow-up date. Only the fields given change. To close a deal use sap_close_deal.",
      input: z.object({
        dealId: ID,
        stage: z.enum(OPEN_STAGES).optional(),
        cash: z.number().int().min(0).max(1_000_000).optional(),
        inKind: z.number().int().min(0).max(1_000_000).optional(),
        owner: z.string().trim().min(1).max(100).optional(),
        nextStep: z.string().trim().min(1).max(500).optional(),
        nextFollowUp: DAY.optional(),
      }),
      properties: {
        dealId: { type: "string" },
        stage: { type: "string", enum: [...OPEN_STAGES] },
        cash: { type: "integer", description: "Cash value in USD." },
        inKind: { type: "integer", description: "In-kind value in USD." },
        owner: { type: "string", description: "Deal owner's name." },
        nextStep: { type: "string" },
        nextFollowUp: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["dealId"],
      plan: async (f) => {
        const p = await loadDeal(f.dealId);
        if (!p) return { error: "SAP deal not found." };
        if (!isOpen(p.deal)) return { error: `${p.company.name} is already ${p.deal.status === "active" ? "won" : "lost"}. Closed deals are changed on the website.` };
        const d = toPipelineDeal(p);
        const changes: string[] = [];
        if (f.stage) changes.push(`${STAGE_LABEL[resolveStage(d)]} → ${STAGE_LABEL[f.stage]}`);
        if (f.cash !== undefined) changes.push(`cash ${money(f.cash)}`);
        if (f.inKind !== undefined) changes.push(`in-kind ${money(f.inKind)}`);
        if (f.owner) changes.push(`owner ${f.owner}`);
        if (f.nextStep) changes.push(`next step "${f.nextStep}"`);
        if (f.nextFollowUp) changes.push(`follow-up ${dayLabel(f.nextFollowUp)}`);
        if (changes.length === 0) return { error: "Nothing to change: give at least one field." };
        const warnings: string[] = [];
        if (f.nextFollowUp && f.nextFollowUp < (await today())) warnings.push("The follow-up date is in the past, so the deal will show as overdue.");
        return { summary: `${p.company.name}: ${changes.join(", ")}`, warnings };
      },
      apply: async (f) => {
        const p = await loadDeal(f.dealId);
        const patch: Record<string, unknown> = {};
        if (f.stage) Object.assign(patch, stagePatch(f.stage));
        if (f.cash !== undefined || f.inKind !== undefined) {
          const cash = f.cash ?? p?.deal.cash_usd ?? null;
          const inKind = f.inKind ?? p?.deal.in_kind_usd ?? null;
          patch.cash_usd = cash;
          patch.in_kind_usd = inKind;
          patch.amount_usd = (cash ?? 0) + (inKind ?? 0);
        }
        if (f.owner) patch.deal_owner = f.owner;
        if (f.nextStep) patch.next_step = f.nextStep;
        if (f.nextFollowUp) patch.next_followup_at = f.nextFollowUp;
        await (await sapData()).updateSapDeal(f.dealId, patch, caller.user.id);
        await revalidate(SAP_PAGE, `${SAP_PAGE}/${f.dealId}`);
      },
    }),
    writeTool(caller, {
      name: "sap_close_deal",
      area: "sap",
      title: "SAP: close a deal won or lost",
      description: "Closes an open deal as won (it becomes a signed partner and counts toward this year's target) or lost.",
      destructive: true,
      input: z.object({ dealId: ID, outcome: z.enum(["won", "lost"]), on: DAY.optional() }),
      properties: {
        dealId: { type: "string" },
        outcome: { type: "string", enum: ["won", "lost"] },
        on: { type: "string", description: "Close date for a win, YYYY-MM-DD. Defaults to today." },
      },
      required: ["dealId", "outcome"],
      plan: async (f) => {
        const p = await loadDeal(f.dealId);
        if (!p) return { error: "SAP deal not found." };
        if (!isOpen(p.deal)) return { error: `${p.company.name} is already closed.` };
        const d = toPipelineDeal(p);
        if (f.outcome === "won") {
          const on = f.on ?? (await today());
          return {
            summary: `${p.company.name}: close as WON on ${dayLabel(on)} (cash ${money(cashOf(d))}, in-kind ${money(inKindOf(d))})`,
            warnings: [
              "This marks the deal as a signed partner and counts it toward this year's SAP target. Reopening it is done on the website.",
              ...(cashOf(d) + inKindOf(d) === 0 ? ["The deal has no cash or in-kind value yet; set it first with sap_update_deal if it's known."] : []),
            ],
          };
        }
        return {
          summary: `${p.company.name}: close as LOST`,
          warnings: ["This closes the deal as lost and removes it from the Today list. Reopening it is done on the website."],
        };
      },
      apply: async (f) => {
        const patch =
          f.outcome === "won"
            ? { status: "active" as const, closed_won_at: f.on ?? (await today()) }
            : { status: "lost" as const };
        await (await sapData()).updateSapDeal(f.dealId, patch, caller.user.id);
        await revalidate(SAP_PAGE, `${SAP_PAGE}/${f.dealId}`);
      },
    }),
    writeTool(caller, {
      name: "sap_add_deal",
      area: "sap",
      title: "SAP: add a new lead",
      description: "Adds a new partner company as a Lead in the SAP pipeline, with an optional owner, next step and follow-up date.",
      input: z.object({
        company: z.string().trim().min(2).max(150),
        industry: z.string().trim().max(100).optional(),
        website: z.string().trim().max(300).optional(),
        owner: z.string().trim().max(100).optional(),
        introducedBy: z.string().trim().max(200).optional(),
        nextStep: z.string().trim().max(500).optional(),
        nextFollowUp: DAY.optional(),
      }),
      properties: {
        company: { type: "string" },
        industry: { type: "string" },
        website: { type: "string" },
        owner: { type: "string", description: "Deal owner's name." },
        introducedBy: { type: "string" },
        nextStep: { type: "string" },
        nextFollowUp: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["company"],
      plan: async (f) => {
        const q = f.company.toLowerCase();
        const existing = (await (await sapData()).getAllSapPartners()).filter((p) => {
          const n = p.company.name.toLowerCase();
          return n.includes(q) || q.includes(n);
        });
        return {
          summary: `New SAP lead: ${f.company}${f.owner ? `, owner ${f.owner}` : ""}${f.nextFollowUp ? `, follow-up ${dayLabel(f.nextFollowUp)}` : ""}`,
          warnings: existing.length
            ? [`Similar deals already exist: ${existing.map((p) => p.company.name).join(", ")}. Check this isn't a duplicate.`]
            : [],
        };
      },
      apply: async (f) => {
        const { createSapPartner, updateSapDeal } = await sapData();
        const { dealId } = await createSapPartner({
          name: f.company,
          industry: f.industry ?? null,
          website: f.website ?? null,
          status: "lead",
          deal_owner: f.owner ?? null,
          introduced_by: f.introducedBy ?? null,
        });
        if (f.nextStep || f.nextFollowUp) {
          await updateSapDeal(dealId, { next_step: f.nextStep ?? null, next_followup_at: f.nextFollowUp ?? null }, caller.user.id);
        }
        await revalidate(SAP_PAGE);
        return { dealId, url: `${origin}${SAP_PAGE}/${dealId}` };
      },
    }),
    writeTool(caller, {
      name: "sap_add_note",
      area: "sap",
      title: "SAP: log a meeting note",
      description:
        "Adds a meeting or call note to an SAP deal's timeline and marks that day as the last contact. A next step given here also " +
        "becomes the deal's next step.",
      input: z.object({
        dealId: ID,
        body: z.string().trim().min(1).max(20000),
        title: z.string().trim().max(200).optional(),
        metOn: DAY.optional(),
        nextStep: z.string().trim().max(500).optional(),
      }),
      properties: {
        dealId: { type: "string" },
        body: { type: "string", description: "The notes: who was there, what was agreed." },
        title: { type: "string", description: "Short title, e.g. 'Lunch with the CEO'." },
        metOn: { type: "string", description: "Meeting date, YYYY-MM-DD. Defaults to today." },
        nextStep: { type: "string" },
      },
      required: ["dealId", "body"],
      plan: async (f) => {
        const p = await loadDeal(f.dealId);
        if (!p) return { error: "SAP deal not found." };
        const day = await today();
        const on = f.metOn ?? day;
        if (on > day) return { error: "A meeting note can't be dated in the future." };
        return {
          summary: `${p.company.name}: note "${f.title ?? f.body.slice(0, 60)}" from ${dayLabel(on)}${f.nextStep ? `, next step "${f.nextStep}"` : ""}`,
          warnings: [],
        };
      },
      apply: async (f) => {
        const p = await loadDeal(f.dealId);
        const on = f.metOn ?? (await today());
        const note = await (await notesData()).addDealNote({
          kind: "sap",
          dealId: f.dealId,
          authorProfileId: caller.user.id,
          metOn: on,
          title: f.title ?? null,
          body: f.body,
          nextStep: f.nextStep ?? null,
          source: "connector",
        });
        const patch: Record<string, unknown> = {};
        if (!p?.deal.last_contact_at || p.deal.last_contact_at < on) patch.last_contact_at = on;
        if (f.nextStep) patch.next_step = f.nextStep;
        if (Object.keys(patch).length) await (await sapData()).updateSapDeal(f.dealId, patch, caller.user.id);
        await revalidate(SAP_PAGE, `${SAP_PAGE}/${f.dealId}`);
        return note;
      },
    }),
  ];

  return [...reads, ...writes];
}
