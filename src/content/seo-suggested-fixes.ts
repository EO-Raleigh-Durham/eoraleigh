// The chapter's own SEO fix log, shown on /board/seo/suggested-fixes.
// Add a fix here as you plan or ship SEO work.

export type Priority = "Quick win" | "Medium lift" | "High lift";
export type Status = "Done" | "In progress" | "Open";

export type Fix = {
  title: string;
  priority: Priority;
  status: Status;
  shippedAt?: string; // YYYY-MM-DD, the day the fix landed
  why: string;
  action: string;
  ref: string;
  shipNote?: string; // what actually shipped, if it differs from the spec
};

export const FIXES: Fix[] = [];
