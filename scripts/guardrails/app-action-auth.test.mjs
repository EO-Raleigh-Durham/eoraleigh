// Every "use server" action file under src/app runs with the secret Supabase
// client, which bypasses RLS, so each exported action must await one of EO's
// guards (directly, or through a helper in the same file) unless it is listed
// below. The scan is edge8-action-auth.mjs, which until now only covered the
// ported Edge8 half (src/entities). A new action file copied without its guard
// now fails here instead of shipping.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkActionAuth } from "./edge8-action-auth.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Helpers that redirect or throw unless the caller holds the role or grant.
const GUARDS = [
  "requireSuperAdmin",
  "requireBoardOrAbove",
  "requireMemberOrAbove",
  "requireAuth",
  "requireAtLeast",
  "requireArea",
];

// Actions allowed to skip the guards above. Keep this short: add an entry only
// with a reason, and never to quiet a failure on a board, admin or member
// action. An entry that no longer matches an export fails the test.
const ALLOWLIST = [
  // Public by design (AGENTS.md: RSVP, survey, dues, partner flows). Anyone
  // with the link may call these; they must never trust client-sent prices,
  // capacity or payment state.
  ["src/app/board/events/actions.ts", "publicRsvp", "public event registration"],
  ["src/app/board/events/actions.ts", "previewEventVoucher", "public voucher preview, advisory only"],
  ["src/app/board/events/actions.ts", "registerMyeoFamilyDay", "public family day registration"],
  ["src/app/events/[id]/survey/actions.ts", "submitEventSurvey", "public post-event survey"],
  ["src/app/survey/actions.ts", "submitSurveyResponse", "public survey"],
  ["src/app/chapter-dues/actions.ts", "createDuesCheckout", "public dues checkout"],
  ["src/app/chapter-dues/bank-transfer/actions.ts", "submitBankTransferRequest", "public dues bank transfer request"],
  ["src/app/secondary-chapter-dues/actions.ts", "createSecondaryDuesCheckout", "public dues checkout"],
  ["src/app/secondary-chapter-dues/bank-transfer/actions.ts", "submitSecondaryBankTransferRequest", "public dues bank transfer request"],
  ["src/app/late-cancellation-fee/actions.ts", "createLateCancellationCheckout", "public fee checkout"],
  ["src/app/partners/suggest/actions.ts", "submitPartnerSuggestion", "public partner suggestion form"],
  // TEMPORARY public photo upload (migration 128): rate-limited, images only,
  // private bucket. Remove when uploads move fully into the member section.
  ["src/app/photos/upload/actions.ts", "startPublicPhotoUploads", "temporary public photo upload, rate-limited"],
  ["src/app/photos/upload/actions.ts", "savePublicPhoto", "temporary public photo upload, server-chosen paths only"],

  // Not public: these check the session themselves and return an error (or act
  // only on the caller's own sign-in) instead of calling a redirecting guard.
  ["src/app/board/chat/actions.ts", "confirmProposal", "checks session, board role and proposal ownership inline"],
  ["src/app/board/chat/actions.ts", "cancelProposal", "checks session, board role and proposal ownership inline"],
  ["src/app/contractor/nda/actions.ts", "acceptNda", "checks session, contractor role and the caller's own grant inline"],
  ["src/app/oauth/consent/actions.ts", "decideAuthorization", "checks session and connector reach inline"],
  ["src/app/login/actions.ts", "getLoginRedirect", "returns a landing path for the caller's own role, no data"],
  ["src/app/profile/actions.ts", "initiateEmailChange", "session client only, changes the caller's own sign-in"],
  ["src/app/profile/actions.ts", "changePassword", "session client only, changes the caller's own sign-in"],
  ["src/app/profile/actions.ts", "signOut", "session client only, ends the caller's own session"],
].map(([file, name, reason]) => ({ file, export: name, reason }));

test("every src/app server action is guarded or explicitly allowlisted", () => {
  const { checked, violations, stale } = checkActionAuth({
    root,
    appDirs: ["src/app"],
    allowlist: ALLOWLIST,
    guards: GUARDS,
  });
  assert.ok(checked > 100, `expected the app's actions to be found, saw ${checked}`);
  assert.deepEqual(violations, [], `unguarded server action(s): every export must await one of ${GUARDS.join(", ")}`);
  assert.deepEqual(stale, [], "allowlist entry matches no exported server action");
});

test("the scan catches an action file with no guard", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "app-action-auth-"));
  try {
    fs.writeFileSync(
      path.join(dir, "actions.ts"),
      '"use server";\n' +
        "export async function guarded() {\n  await requireBoardOrAbove();\n}\n" +
        "export async function unguarded() {\n  const user = await getSessionUser();\n  return user;\n}\n",
    );
    const { violations } = checkActionAuth({ root: dir, appDirs: ["."], allowlist: [], guards: GUARDS });
    assert.deepEqual(violations.map((v) => v.export), ["unguarded"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
