import { NextResponse } from "next/server";
import { requireBoardOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getForumConstitution } from "@/lib/forum-constitutions";
import { FORUM_CONSTITUTIONS_BUCKET } from "@/lib/forum-constitution-files";

export const dynamic = "force-dynamic";

// Opens a forum's constitution: board check, then a one-minute signed link.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireBoardOrAbove();
  const { id: forumId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(forumId)) return new NextResponse("Not found", { status: 404 });

  const constitution = await getForumConstitution(forumId);
  if (!constitution) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await supabase.storage
    .from(FORUM_CONSTITUTIONS_BUCKET)
    .createSignedUrl(constitution.storagePath, 60, { download: constitution.fileName });
  if (error || !data) return new NextResponse("Could not open the file", { status: 502 });
  return NextResponse.redirect(data.signedUrl);
}
