import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { CHAPTER_NAME } from "../kernel/config/chapter.ts";

// The open-source copy builds its database from one schema file, without the
// numbered migrations these tests read.
const migration = (name: string) => new URL(`../../supabase/${name}`, import.meta.url);
const noMigration = (name: string) => (existsSync(migration(name)) ? false : "numbered migrations are not in this copy");
import {
  MAX_PHOTO_BYTES,
  CHAPTER_PHOTOS_BUCKET,
  PHOTO_CONTENT_TYPES,
  cleanCaption,
  isPublicUploadPath,
  normalizeEmail,
  overHourlyCap,
  ownsUploadPath,
  PUBLIC_MAX_PER_HOUR,
  sniffImageType,
  publicUploadPath,
  refusePhoto,
  uploadPath,
} from "./chapter-photos.ts";

const USER = "6f1f7a52-0b7e-4d0a-9d3c-1d2e3f4a5b6c";
const OTHER = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const ID = "11111111-2222-4333-8444-555555555555";

test("accepts photos within the size limit and refuses everything else", () => {
  assert.equal(refusePhoto({ name: "a.jpg", type: "image/jpeg", size: 1000 }), null);
  assert.equal(refusePhoto({ name: "a.png", type: "image/png", size: MAX_PHOTO_BYTES }), null);
  assert.match(refusePhoto({ name: "a.svg", type: "image/svg+xml", size: 10 }) ?? "", /isn't a JPG/);
  assert.match(refusePhoto({ name: "a.heic", type: "image/heic", size: 10 }) ?? "", /isn't a JPG/);
  assert.match(refusePhoto({ name: "a.pdf", type: "application/pdf", size: 10 }) ?? "", /isn't a JPG/);
  assert.match(refusePhoto({ name: "a.jpg", type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 }) ?? "", /larger/);
  assert.match(refusePhoto({ name: "a.jpg", type: "image/jpeg", size: 0 }) ?? "", /empty/);
  assert.match(refusePhoto({ name: "a.jpg", type: "image/jpeg", size: Number.NaN }) ?? "", /empty/);
});

test("an upload path belongs only to the user it was issued to", () => {
  const path = uploadPath(USER, ID, "image/jpeg");
  assert.equal(path, `uploads/${USER}/${ID}.jpg`);
  assert.equal(ownsUploadPath(USER, path), true);
  assert.equal(ownsUploadPath(OTHER, path), false);
  assert.equal(ownsUploadPath(USER, `photos/${ID}.jpg`), false);
  assert.equal(ownsUploadPath(USER, `uploads/${USER}/../${OTHER}/${ID}.jpg`), false);
  assert.equal(ownsUploadPath(USER, `uploads/${USER}/${ID}.jpg.html`), false);
});

test("captions are trimmed, collapsed, capped and optional", () => {
  assert.equal(cleanCaption("  Gala   night \n 2026 "), "Gala night 2026");
  assert.equal(cleanCaption("   "), null);
  assert.equal(cleanCaption(undefined), null);
  assert.equal(cleanCaption(42), null);
  assert.equal(cleanCaption("x".repeat(900))?.length, 500);
});

test("the bucket in migration 127 matches the rules", { skip: noMigration("127_chapter_photos.sql") }, () => {
  const sql = readFileSync(new URL("../../supabase/127_chapter_photos.sql", import.meta.url), "utf8");
  assert.match(sql, new RegExp(`'${CHAPTER_PHOTOS_BUCKET}', '${CHAPTER_PHOTOS_BUCKET}', false, ${MAX_PHOTO_BYTES}`));
  for (const type of Object.keys(PHOTO_CONTENT_TYPES)) assert.ok(sql.includes(`'${type}'`), type);
  assert.match(sql, /enable row level security/);
  assert.doesNotMatch(sql, /create policy/i);
});

test("public upload paths are server-chosen and nothing else passes", () => {
  const path = publicUploadPath(ID, "image/png");
  assert.equal(path, `public-uploads/${ID}.png`);
  assert.equal(isPublicUploadPath(path), true);
  assert.equal(isPublicUploadPath(`public-uploads/../photos/${ID}.jpg`), false);
  assert.equal(isPublicUploadPath(`photos/${ID}.jpg`), false);
  assert.equal(isPublicUploadPath(`uploads/${USER}/${ID}.jpg`), false);
  assert.equal(isPublicUploadPath(`public-uploads/${ID}.svg`), false);
});

test("emails are normalized and junk is refused", () => {
  assert.equal(normalizeEmail("  Dave@Example.COM "), "dave@example.com");
  assert.equal(normalizeEmail("not an email"), null);
  assert.equal(normalizeEmail("a@b"), null);
  assert.equal(normalizeEmail(`${"a".repeat(320)}@b.co`), null);
  assert.equal(normalizeEmail(undefined), null);
});

test("migration 128 keeps the table closed and old rows verified", { skip: noMigration("128_chapter_photos_public_upload.sql") }, () => {
  const sql = readFileSync(new URL("../../supabase/128_chapter_photos_public_upload.sql", import.meta.url), "utf8");
  assert.match(sql, /email_matches_member boolean not null default true/);
  assert.match(sql, /via_public_upload boolean not null default false/);
  assert.doesNotMatch(sql, /create policy|grant /i);
});

test("a non-image disguised as a .jpg is refused by its bytes", () => {
  const enc = (t: string) => new TextEncoder().encode(t);
  assert.equal(sniffImageType(enc("<html><script>alert(1)</script>")), null);
  assert.equal(sniffImageType(enc("%PDF-1.7 renamed.jpg")), null);
  assert.equal(sniffImageType(enc('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(sniffImageType(new Uint8Array([0x4d, 0x5a, 0x90, 0x00])), null); // .exe
  assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(sniffImageType(enc("RIFF\0\0\0\0WEBPVP8 ")), "image/webp");
});

test("the hourly cap triggers on the busier of email and IP", () => {
  assert.equal(overHourlyCap(0, 0, 30), false);
  assert.equal(overHourlyCap(PUBLIC_MAX_PER_HOUR - 30, 0, 30), false);
  assert.equal(overHourlyCap(PUBLIC_MAX_PER_HOUR - 29, 0, 30), true);
  assert.equal(overHourlyCap(0, PUBLIC_MAX_PER_HOUR, 1), true);
  assert.equal(overHourlyCap(5, PUBLIC_MAX_PER_HOUR - 5, 5), false);
});

test("migration 129 records marketing consent and the wording is versioned", { skip: noMigration("129_chapter_photos_marketing_consent.sql") }, async () => {
  const sql = readFileSync(new URL("../../supabase/129_chapter_photos_marketing_consent.sql", import.meta.url), "utf8");
  assert.match(sql, /marketing_consent_at timestamptz/);
  assert.match(sql, /marketing_consent_version text/);
  assert.doesNotMatch(sql, /create policy|grant /i);
  const rules = await import("./chapter-photos.ts");
  assert.match(rules.MARKETING_CONSENT_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(rules.MARKETING_CONSENT_TERMS.join(" ").includes(CHAPTER_NAME));
  assert.ok(!/\u2014/.test(rules.MARKETING_CONSENT_TERMS.join(" ") + rules.MARKETING_CONSENT_LABEL), "no em dashes");
});
