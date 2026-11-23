// Pure rules for forum constitution files: which files are accepted and where
// each one is kept in private storage. No imports, so the board page, its
// actions and the unit tests share one definition.

// Private Supabase storage bucket (migration 130). Server secret key only.
export const FORUM_CONSTITUTIONS_BUCKET = "forum-constitutions";

export const MAX_CONSTITUTION_BYTES = 20 * 1024 * 1024; // 20 MB

// The file picker's accept list.
export const CONSTITUTION_ACCEPT = ".pdf,.doc,.docx";

// Keep in step with the bucket's allowed_mime_types in migration 130.
const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export const CONSTITUTION_CONTENT_TYPES = [...new Set(Object.values(CONTENT_TYPES))];

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

// Returns a message for the uploader, or null when the file is acceptable.
export function validateConstitutionFile(file: { name: string; size: number }): string | null {
  if (!file.name.trim()) return "Choose a file to upload.";
  if (!CONTENT_TYPES[extension(file.name)]) return "The constitution must be a PDF or Word file.";
  if (file.size <= 0) return "That file is empty.";
  if (file.size > MAX_CONSTITUTION_BYTES) return "That file is too large (maximum 20 MB).";
  return null;
}

// Storage key for one upload: <forum id>/<random id>.<ext>. The uploader's
// own file name is kept in the table, never in the key.
export function constitutionPath(forumId: string, uploadId: string, name: string): string {
  return `${forumId}/${uploadId}.${extension(name)}`;
}

// True when a path is one constitutionPath() could have made for this forum.
export function isConstitutionPathFor(forumId: string, path: string): boolean {
  return path.startsWith(`${forumId}/`) && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|doc|docx)$/.test(path);
}
