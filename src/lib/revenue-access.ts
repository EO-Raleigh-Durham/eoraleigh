import { supabase } from "./supabase";
import { currentBoardTerm, type BoardAccessClient } from "./board-access";
import type { SessionUser } from "./auth";
import type { RosterMember } from "./people";

// Server-only. Who may see member revenue: the Finance Chair and the
// Membership Chair, per the owner's call. Everyone else on the board sees
// revenue masked. Employee counts are NOT restricted.

// TEMPORARY testing allowlist, normally empty: revenue access belongs to the
// Finance and Membership chairs alone. To test as yourself, add your login
// email (e.g. "you@example.com"), deploy, and remove it again when done.
const REVENUE_ACCESS_EMAILS: string[] = [];

// board_roles.key values whose current Chair/Co-Chair may view revenue.
const REVENUE_ROLE_KEYS = ["finance", "membership"];

const CHAIR_POSITIONS = ["Chair", "Co-Chair"];

/**
 * True if the signed-in user may view member revenue: an allowlisted email,
 * or a current Chair/Co-Chair appointment (the board term in force today,
 * same rule as board access in board-access.ts) on the Finance or Membership portfolio.
 */
export async function canViewRevenue(
  user: SessionUser | null,
): Promise<boolean> {
  if (!user) return false;
  if (REVENUE_ACCESS_EMAILS.includes(user.email.toLowerCase())) return true;
  if (!user.personId) return false;

  const fy = await currentBoardTerm(supabase as unknown as BoardAccessClient);
  if (fy == null) return false;

  const { data, error } = await supabase
    .from("board_appointments")
    .select("id, board_roles!inner(key)")
    .eq("person_id", user.personId)
    .eq("fiscal_year_start", fy)
    .in("position", CHAIR_POSITIONS)
    .in("board_roles.key", REVENUE_ROLE_KEYS)
    .limit(1);
  if (error) {
    console.warn("canViewRevenue:", error.message);
    return false;
  }
  return (data ?? []).length > 0;
}

/**
 * Strips the revenue fields (revenue and the prior-exit answer; employee
 * counts stay visible) from a roster member before it is handed to a viewer
 * without revenue access. Must run on the server: masking in the UI alone
 * would still ship the numbers to the browser in the serialized props.
 */
export function redactMemberFinancials(m: RosterMember): RosterMember {
  return {
    ...m,
    requalification: m.requalification
      ? {
          ...m.requalification,
          revenue: null,
          exitedOver8m: null,
          exitDetails: null,
        }
      : null,
  };
}
