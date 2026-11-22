// The chapter app's version of edge8-web's kernel/identity/team-assume.ts (EO-owned).
// Edge8 lets a Super Admin view the Team pages as someone else. The chapter app has
// no such view, so there is never an impersonation to refuse writes for.

export type TeamImpersonation = { adminEmail: string; sessionId: string; expiresAt: string };

export const READ_ONLY_WHILE_ASSUMING = "You are viewing the Team pages as someone else, which is read-only. Exit the view to make changes.";

export async function refuseWritesWhileAssuming(_impersonation: TeamImpersonation | null | undefined): Promise<void> {}
