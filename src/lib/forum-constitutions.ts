import { supabase } from "./supabase";

// Server-only reads for forum constitutions (migration 130). This client
// bypasses RLS: callers must already have passed requireBoardOrAbove().

export type ForumConstitution = {
  forumId: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number | null;
  uploadedByName: string | null;
  uploadedAt: string;
};

type Row = {
  forum_id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
};

const COLUMNS = "forum_id, file_name, storage_path, size_bytes, uploaded_by_name, uploaded_at";

function toConstitution(r: Row): ForumConstitution {
  return {
    forumId: r.forum_id,
    fileName: r.file_name,
    storagePath: r.storage_path,
    sizeBytes: r.size_bytes,
    uploadedByName: r.uploaded_by_name,
    uploadedAt: r.uploaded_at,
  };
}

export async function listForumConstitutions(): Promise<ForumConstitution[]> {
  const { data, error } = await supabase.from("forum_constitutions").select(COLUMNS);
  if (error) throw error;
  return (data as Row[]).map(toConstitution);
}

export async function getForumConstitution(forumId: string): Promise<ForumConstitution | null> {
  const { data, error } = await supabase
    .from("forum_constitutions")
    .select(COLUMNS)
    .eq("forum_id", forumId)
    .maybeSingle();
  if (error) throw error;
  return data ? toConstitution(data as Row) : null;
}
