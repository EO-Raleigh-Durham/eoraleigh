// MCP.0 guardrail: a connector (OAuth client) token is never a website
// sign-in, and the connector's entry points re-check who is calling.
//
// Supabase's OAuth server issues the apps people connect (Claude, ChatGPT,
// Grok) ordinary user JWTs with a client_id claim. If any server-side cookie
// reader validated a session with a bare auth.getUser(), a connector token
// placed in a cookie would open /board and every Server Action. So every
// server-side session read must go through firstPartyUser
// (src/lib/oauth-client-token.ts), and /api/mcp must accept only tokens that
// carry a client_id.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");

function walk(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(rel);
  }
  return out;
}

const isClient = (src) => /^\s*["']use client["']/.test(src);

test("no server code validates a cookie session with a bare auth.getUser()", () => {
  const offenders = walk("src")
    .map((f) => [f, read(f)])
    .filter(([, src]) => !isClient(src) && /\.auth\.getUser\(\s*\)/.test(src))
    .map(([f]) => f);
  assert.deepEqual(offenders, [], "use firstPartyUser(client) from src/lib/oauth-client-token.ts instead");
});

test("every cookie session reader goes through firstPartyUser", () => {
  for (const f of ["src/lib/auth.ts", "src/proxy.ts", "src/kernel/identity/session-user.ts"]) {
    assert.match(read(f), /firstPartyUser\(/, f);
  }
});

test("firstPartyUser refuses a token that names an OAuth client", () => {
  const src = read("src/lib/oauth-client-token.ts");
  assert.match(src, /if \(!claimsOf\(token\) \|\| oauthClientOf\(token\)\) return null;/);
  assert.match(src, /client\.auth\.getUser\(token\)/, "the inspected token is the one validated");
});

test("/api/mcp accepts only a token issued to an OAuth client", () => {
  const caller = read("src/lib/mcp/caller.ts");
  assert.match(caller, /const clientId = oauthClientOf\(token\);\s*if \(!clientId\) return null;/);
  const route = read("src/app/api/mcp/route.ts");
  assert.match(route, /callerFromBearer\(request\.headers\.get\("authorization"\)\)/);
  assert.match(route, /if \(!resolved\) return unauthorized\(origin\);/);
  assert.match(route, /toolsFor\(caller, origin, filter\)/, "only the caller's tools are served");
});

test("the consent decision re-checks the session and the person's reach", () => {
  const src = read("src/app/oauth/consent/actions.ts");
  const body = src.slice(src.indexOf("export async function decideAuthorization"));
  const session = body.indexOf("await getSessionUser()");
  const reach = body.indexOf("await reachForUser(user)");
  const approve = body.indexOf("approveAuthorization(");
  assert.ok(session > 0 && reach > session && approve > reach, "session, then reach, then approve");
  assert.match(body, /checkRedirect\(redirectUri\)\.allowed/, "the redirect host is checked on the posted form too");
});

test("write tools run only through writeTool's receipt check", () => {
  const src = read("src/lib/mcp/tools-core.ts");
  assert.match(src, /const problem = receiptProblem\(subject, fields, receipt\);\s*if \(problem\) return \{ error: problem \};/);
  // Area tool files may build writes only with writeTool(): a hand-made tool
  // marked readOnly: false would skip the preview and its receipt.
  for (const file of ["src/lib/mcp/tools.ts", "src/lib/mcp/sap-tools.ts", "src/lib/mcp/membership-tools.ts"]) {
    assert.doesNotMatch(read(file), /readOnly:\s*false/, `${file} builds a write without writeTool`);
  }
});
