// Server-only Lark Drive client.
//
// Used by /api/revenue-verification to create one folder per submission
// inside a shared parent folder and upload the submitted file(s) into it.
//
// The workspace is on Lark international (<tenant>.jp.larksuite.com), so the
// Open API base is https://open.larksuite.com (NOT open.feishu.cn). Override
// with LARK_DRIVE_BASE if the tenant ever moves.
//
// Requires a Lark *custom app* (internal) with Drive scopes:
//   drive:drive  (or drive:file)  +  the app added as a collaborator with
//   edit access on the target parent folder. See
//   docs/revenue-verification-lark-setup.md for the one-time setup.
//
// Credentials come from env: LARK_APP_ID, LARK_APP_SECRET.
// Parent folder token from env LARK_REVENUE_FOLDER_TOKEN (no fallback: a
// folder id is per chapter). NEVER import this from a client component.

const BASE = process.env.LARK_DRIVE_BASE || "https://open.larksuite.com";

export function getRevenueFolderToken(): string {
  return process.env.LARK_REVENUE_FOLDER_TOKEN ?? "";
}

export function larkConfigured(): boolean {
  return Boolean(process.env.LARK_APP_ID && process.env.LARK_APP_SECRET);
}

// ---- tenant_access_token (cached in memory until 5 min before expiry) ----

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getTenantToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.value;
  }

  const appId = process.env.LARK_APP_ID;
  const appSecret = process.env.LARK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Lark not configured (LARK_APP_ID / LARK_APP_SECRET missing)");
  }

  const res = await fetch(`${BASE}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = (await res.json()) as {
    code: number;
    msg: string;
    tenant_access_token?: string;
    expire?: number;
  };
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`Lark auth failed (code ${data.code}): ${data.msg}`);
  }

  // expire is seconds; refresh 5 min early.
  const ttlMs = Math.max(((data.expire ?? 7200) - 300) * 1000, 60_000);
  cachedToken = { value: data.tenant_access_token, expiresAt: now + ttlMs };
  return cachedToken.value;
}

// ---- folder + upload ----

async function createFolder(name: string, parentToken: string): Promise<{ token: string; url: string }> {
  const token = await getTenantToken();
  const res = await fetch(`${BASE}/open-apis/drive/v1/files/create_folder`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ name, folder_token: parentToken }),
  });
  const data = (await res.json()) as {
    code: number;
    msg: string;
    data?: { token: string; url: string };
  };
  if (data.code !== 0 || !data.data?.token) {
    throw new Error(`Lark create_folder failed (code ${data.code}): ${data.msg}`);
  }
  return { token: data.data.token, url: data.data.url };
}

async function uploadFile(
  folderToken: string,
  fileName: string,
  bytes: Uint8Array,
): Promise<string> {
  const token = await getTenantToken();

  const body = new FormData();
  body.append("file_name", fileName);
  body.append("parent_type", "explorer");
  body.append("parent_node", folderToken);
  body.append("size", String(bytes.byteLength));
  // Blob from the raw bytes; Lark only reads the binary part.
  body.append("file", new Blob([bytes as BlobPart]), fileName);

  const res = await fetch(`${BASE}/open-apis/drive/v1/files/upload_all`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }, // FormData sets content-type + boundary
    body,
  });
  const data = (await res.json()) as {
    code: number;
    msg: string;
    data?: { file_token: string };
  };
  if (data.code !== 0 || !data.data?.file_token) {
    throw new Error(`Lark upload_all failed for "${fileName}" (code ${data.code}): ${data.msg}`);
  }
  return data.data.file_token;
}

export type LarkFileInput = { name: string; bytes: Uint8Array };

export type LarkUploadResult = {
  folderToken: string;
  folderUrl: string;
  fileTokens: string[];
};

// Sanitize a string into a safe Lark folder name.
function safeName(raw: string): string {
  const cleaned = raw.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || "Submission").slice(0, 240);
}

// Create one folder under the shared parent and upload every file into it.
// Throws on any failure so the caller can mark the row 'failed' for retry.
export async function uploadSubmission(
  folderName: string,
  files: LarkFileInput[],
): Promise<LarkUploadResult> {
  const parent = getRevenueFolderToken();
  if (!parent) throw new Error("LARK_REVENUE_FOLDER_TOKEN is not set");
  const folder = await createFolder(safeName(folderName), parent);

  const fileTokens: string[] = [];
  for (const f of files) {
    fileTokens.push(await uploadFile(folder.token, f.name, f.bytes));
  }

  return { folderToken: folder.token, folderUrl: folder.url, fileTokens };
}
