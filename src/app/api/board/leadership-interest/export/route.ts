import { NextResponse } from "next/server";
import { roleAtLeast } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { listLeadershipInterestSignups } from "@/lib/inquiries";

// GET /api/board/leadership-interest/export
// CSV of the Leadership in the AI Era interest list. Board or super-admin only,
// checked here because this route uses the secret-key client (bypasses RLS).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roleAtLeast(user.role, "board")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let signups;
  try {
    signups = await listLeadershipInterestSignups();
  } catch (err) {
    console.error("[/api/board/leadership-interest/export] failed:", err);
    return NextResponse.json({ error: "Could not load the interest list" }, { status: 500 });
  }

  const csv = toCsv(
    ["Name", "Email", "EO member", "Role", "Company", "Revenue scale", "Submitted (UTC)"],
    signups.map((s) => [
      s.name,
      s.email,
      s.membership === "member" ? "Member" : s.membership === "not_yet" ? "Not yet" : "",
      s.role,
      s.company,
      s.revenueScale,
      s.createdAt,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leadership-interest-list.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
