"use server";

import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import { markBoardInquiriesRead } from "@/lib/inquiries";

// Flip new board messages to read, then refresh the board layout so the sidebar
// inbox badge clears. Called once when a board member opens the inbox.
export async function markInboxRead(): Promise<void> {
  await requireBoardOrAbove();
  await markBoardInquiriesRead();
  revalidatePath("/board", "layout");
}
