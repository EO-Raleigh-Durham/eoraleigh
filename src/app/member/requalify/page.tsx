import { pageMeta } from "@/lib/page-metadata";
import { requireMemberOrAbove } from "@/lib/auth";
import { getPersonById } from "@/lib/people";
import { supabase } from "@/lib/supabase";
import { RequalifyForm, type RequalifyPrefill } from "./RequalifyForm";
import {
  getRequalificationForPerson,
  fyShort,
  REQUAL_FY_START,
  type Requalification,
} from "@/lib/requalification";
import { CHAPTER_NAME, CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

// Annual member re-qualification form (Plan 26). Members only (access-map
// tier "member"): the proxy forces login before the page renders. One
// submission per member per fiscal year; a member who already submitted sees
// a read-only summary instead of the form.
export const metadata = pageMeta({
  title: "Member Re-Qualification Form",
  description:
    `Confirm your membership details and tell us how your business is doing, so we can keep ${CHAPTER_NAME}'s records in line with EO reporting and support you better`,
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  path: "/member/requalify",
});

// Prefill the confirm fields from whatever we already know about the signed-in
// member.
async function loadPrefill(personId: string | null, fallback: {
  name: string | null;
  email: string;
}): Promise<RequalifyPrefill> {
  const prefill: RequalifyPrefill = {
    name: fallback.name ?? "",
    email: fallback.email ?? "",
  };
  if (!personId) return prefill;

  const person = await getPersonById(personId);
  if (person) {
    if (person.name) prefill.name = person.name;
    if (person.email) prefill.email = person.email;
    if (person.phone) prefill.phone = person.phone;
    if (person.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("name, employees")
        .eq("id", person.company_id)
        .maybeSingle();
      if (company?.name) prefill.company = company.name;
      if (company?.employees != null) prefill.employees = String(company.employees);
    }
  }
  return prefill;
}

function money(n: number | null): string {
  return n != null ? `$${n.toLocaleString("en-US")}` : "-";
}

// Read-only summary for a member who already re-qualified this fiscal year.
function AlreadySubmitted({ requal }: { requal: Requalification }) {
  const rows: [string, string][] = [
    ["Name", requal.confirmedName ?? "-"],
    ["Email", requal.confirmedEmail ?? "-"],
    ["Phone", requal.confirmedPhone ?? "-"],
    ["Primary company", requal.confirmedCompany ?? "-"],
    [`${REQUAL_FY_START - 1} revenue (USD)`, money(requal.revenue)],
    [
      "Current employees",
      requal.employeeCount != null ? requal.employeeCount.toLocaleString() : "-",
    ],
    ["Ownership", requal.ownershipPct != null ? `${requal.ownershipPct}%` : "-"],
    ["Biggest challenge", requal.biggestChallenge ?? "-"],
  ];
  if (requal.exitedOver8m != null) {
    rows.push([
      "Exited a company for over $8M",
      requal.exitedOver8m ? "Yes" : "No",
    ]);
    if (requal.exitedOver8m && requal.exitDetails) {
      rows.push(["Exit details", requal.exitDetails]);
    }
  }
  const submitted = new Date(requal.submittedAt).toLocaleDateString("en-US", {
    timeZone: CHAPTER_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div>
      <section className="section section--tight">
        <div className="container container--narrow">
          <div className="join-card join-card--success">
            <div className="join-success-mark">✓</div>
            <h2 className="display-3" style={{ marginBottom: 16 }}>
              You&apos;re all set for {fyShort(REQUAL_FY_START)}
            </h2>
            <p className="lead" style={{ marginBottom: 8, color: "var(--text-muted)" }}>
              You submitted your re-qualification on {submitted}. Members complete
              this once per membership year.
            </p>
            <p className="micro" style={{ marginBottom: 24, color: "var(--text-muted)" }}>
              Spot a mistake? Contact the chapter team and we&apos;ll fix it for you.
            </p>
            <div className="review-list" style={{ textAlign: "left" }}>
              {rows.map(([k, v]) => (
                <div key={k} className="review-row">
                  <div className="review-key eyebrow">{k}</div>
                  <div className="review-val">{v || "-"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function RequalifyPage() {
  const user = await requireMemberOrAbove();

  if (user.personId) {
    const existing = await getRequalificationForPerson(user.personId);
    if (existing) return <AlreadySubmitted requal={existing} />;
  }

  const prefill = await loadPrefill(user.personId, {
    name: user.fullName,
    email: user.email,
  });
  // Members report their most recent completed calendar year, i.e. the year
  // before the FY they re-qualify into.
  return <RequalifyForm prefill={prefill} revenueYear={REQUAL_FY_START - 1} />;
}
