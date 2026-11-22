// Pure rules for the documents uploaded with a revenue verification:
// which files are accepted and where each one is kept in private storage.
// No imports, so the route and the unit tests share one definition.

// Private Supabase storage bucket (migration 125). Server secret key only:
// no storage policies, no public or signed URLs handed to visitors.
export const REVENUE_VERIFICATION_BUCKET = "revenue-verification-files";

export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per file

// The same types the form's file picker offers. Keep in step with the
// bucket's allowed_mime_types in migration 125.
const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

// The content type stored with the file, decided by the file extension (the
// browser-reported type is client-controlled). Null when the type is not accepted.
export function contentTypeFor(name: string): string | null {
  return CONTENT_TYPES[extension(name)] ?? null;
}

// Returns a message for the member, or null when the files are acceptable.
export function validateFiles(files: { name: string; size: number }[]): string | null {
  if (files.length === 0) return "Please attach your financial report/statement.";
  if (files.length > MAX_FILES) return `Too many files (maximum ${MAX_FILES}).`;
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) return `"${f.name}" is too large (maximum 20 MB per file).`;
    if (!contentTypeFor(f.name)) {
      return `"${f.name}" is not an accepted file type (PDF, Word, Excel, CSV, PNG or JPG).`;
    }
  }
  return null;
}

// Storage key for one file: <folder>/<position>-<safe name>. Storage keys
// reject many characters (accents, spaces, slashes), so the name is reduced
// to plain ASCII; the member's original name stays in file_names.
export function storagePath(folder: string, index: number, name: string): string {
  const ext = extension(name);
  const stem = (ext ? name.slice(0, -(ext.length + 1)) : name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // drop accents, keep the base letter
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${folder}/${index + 1}-${stem || "statement"}${ext ? `.${ext}` : ""}`;
}
