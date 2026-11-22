import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

// readdir with recursive: true returns OS-native separators, so normalize before
// comparing against the forward-slash paths this file asserts on.
const posix = (file) => file.split(path.sep).join("/");

test("member pages and service-key actions keep local member guards", async () => {
  const memberRoot = path.join(root, "src/app/member");
  const memberFiles = (await readdir(memberRoot, { recursive: true }))
    .filter((file) => /(?:page|actions)\.tsx?$/.test(file))
    .map((file) => `src/app/member/${posix(file)}`)
    .filter((file) => file !== "src/app/member/events/page.tsx");
  const guardedFiles = [
    ...memberFiles,
    "src/app/portal/newsletters/[slug]/page.tsx",
    "src/lib/directory.ts",
    "src/lib/newsletters.ts",
    "src/lib/priorities.ts",
    "src/lib/member-blog.ts",
  ];

  for (const file of guardedFiles) {
    assert.match(
      await read(file),
      /requireMemberOrAbove\s*\(/,
      `${file} lost its member-level authorization check`,
    );
  }
});

test("guest event portal keeps authenticated self-scope guards", async () => {
  for (const file of [
    "src/app/member/layout.tsx",
    "src/app/member/events/page.tsx",
  ]) {
    assert.match(await read(file), /requireAuth\s*\(/, `${file} lost its guest authentication check`);
  }
});

test("every member page is covered by the local-guard scan", async () => {
  const memberRoot = path.join(root, "src/app/member");
  const pages = (await readdir(memberRoot, { recursive: true }))
    .map(posix)
    .filter((file) => file.endsWith("page.tsx"));
  assert(pages.includes("events/page.tsx"), "guest My Events route disappeared");
  assert(pages.length > 1, "member route discovery did not find member-only pages");
});

test("member-only post bodies are not loaded before role authorization", async () => {
  const source = await read("src/app/post/[slug]/page.tsx");
  const page = source.slice(source.indexOf("export default async function PostPage"));
  const accessCheck = page.indexOf("getBlogPostAudienceBySlug(slug)");
  const memberCheck = page.indexOf('roleAtLeast(user.role, "member")');
  const bodyRead = page.indexOf("getBlogPostBySlug(slug)");

  assert(accessCheck >= 0, "post route lost its minimal audience lookup");
  assert(memberCheck > accessCheck, "post route lost its member role check");
  assert(bodyRead > memberCheck, "post body is loaded before member authorization");
});

test("member directory payload excludes direct contact fields", async () => {
  const source = await read("src/lib/directory.ts");
  const select = source.match(/\.select\(\s*([\s\S]*?)\)\s*\.eq\("status", "active"\)/)?.[1];

  assert(select, "could not locate member directory select payload");
  assert.doesNotMatch(select, /\bemail\b|\bphone\b/);
});

test("ticket and public RSVP paths remain independent of member authentication", async () => {
  const ticketPage = await read("src/app/t/[code]/page.tsx");
  assert.doesNotMatch(ticketPage, /require(?:Auth|MemberOrAbove)\s*\(/);

  const eventActions = await read("src/app/board/events/actions.ts");
  const publicRsvp = eventActions.slice(
    eventActions.indexOf("export async function publicRsvp"),
    eventActions.indexOf("export async function", eventActions.indexOf("export async function publicRsvp") + 1),
  );
  assert(publicRsvp.length > 0, "could not locate publicRsvp action");
  assert.doesNotMatch(publicRsvp, /require(?:Auth|MemberOrAbove)\s*\(/);
});

test("login profile provisioning derives identity from the authenticated session", async () => {
  const actions = await read("src/app/login/actions.ts");
  assert.doesNotMatch(actions, /createGuestProfile|userId:\s*string|email:\s*string/);

  const callback = await read("src/app/api/auth/callback/route.ts");
  assert.match(callback, /exchangeCodeForSession\s*\(/);
  assert.match(callback, /provisionVerifiedUserProfile\s*\(data\.user\)/);
});

test("active sessions re-check current chapter membership", async () => {
  const auth = await read("src/lib/auth.ts");
  // getSessionUser (cookie sign-in) and the board connector (src/lib/mcp/caller.ts)
  // both resolve the profile through sessionUserForAuthUser, so the re-check
  // lives there and holds for both.
  const cookieStart = auth.indexOf("export const getSessionUser");
  assert(cookieStart >= 0, "missing getSessionUser");
  const cookieLookup = auth.slice(cookieStart, auth.indexOf("\n/**", cookieStart + 1));
  assert.match(cookieLookup, /return sessionUserForAuthUser\(user\.id\)/);
  const start = auth.indexOf("export async function sessionUserForAuthUser");
  const end = auth.indexOf("\n/**", start + 1);
  assert(start >= 0, "missing sessionUserForAuthUser");
  const sessionLookup = auth.slice(start, end < 0 ? undefined : end);
  assert.match(sessionLookup, /lookupCurrentMembership\(profile\.person_id\)/);
  assert.match(sessionLookup, /resolvedProfileRole\(role, membership\.active\)/);
  assert.match(sessionLookup, /if \(membership\.error\) return null/);

  const membershipLookup = auth.slice(
    auth.indexOf("async function lookupCurrentMembership"),
    auth.indexOf("\n/**", auth.indexOf("async function lookupCurrentMembership")),
  );
  assert.match(membershipLookup, /\$\{CHAPTER_NAME\} chapter not found/);
  assert.match(membershipLookup, /\.eq\("chapter_name", CHAPTER_NAME\)/);
});
