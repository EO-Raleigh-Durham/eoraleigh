import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  MAX_FILE_BYTES,
  MAX_FILES,
  REVENUE_VERIFICATION_BUCKET,
  contentTypeFor,
  storagePath,
  validateFiles,
} from "./revenue-verification-files.ts";

const pdf = { name: "statement.pdf", size: 1000 };

test("accepts the file types the form offers", () => {
  for (const ext of ["pdf", "doc", "docx", "xls", "xlsx", "csv", "png", "jpg", "jpeg"]) {
    assert.equal(validateFiles([{ name: `report.${ext}`, size: 1 }]), null, ext);
  }
  assert.equal(validateFiles([{ name: "REPORT.PDF", size: 1 }]), null);
});

test("rejects missing, too many, too large and unaccepted files", () => {
  assert.match(validateFiles([]) ?? "", /attach/);
  assert.match(validateFiles(Array(MAX_FILES + 1).fill(pdf)) ?? "", /Too many files/);
  assert.equal(validateFiles(Array(MAX_FILES).fill(pdf)), null);
  assert.match(validateFiles([{ name: "big.pdf", size: MAX_FILE_BYTES + 1 }]) ?? "", /too large/);
  assert.equal(validateFiles([{ name: "ok.pdf", size: MAX_FILE_BYTES }]), null);
  for (const name of ["run.exe", "page.html", "image.svg", "noextension", "statement.pdf.js"]) {
    assert.match(validateFiles([{ name, size: 1 }]) ?? "", /not an accepted file type/, name);
  }
});

test("content type comes from the extension", () => {
  assert.equal(contentTypeFor("a.pdf"), "application/pdf");
  assert.equal(contentTypeFor("a.JPG"), "image/jpeg");
  assert.equal(contentTypeFor("a.csv"), "text/csv");
  assert.equal(contentTypeFor("a.zip"), null);
});

test("storage paths are plain ASCII, stay in the folder and never collide", () => {
  assert.equal(storagePath("abc", 0, "statement.pdf"), "abc/1-statement.pdf");
  assert.equal(storagePath("abc", 1, "Báo cáo tài chính 2025.PDF"), "abc/2-Bao_cao_tai_chinh_2025.pdf");
  assert.equal(storagePath("abc", 0, "../../etc/passwd.pdf"), "abc/1-etc_passwd.pdf");
  assert.equal(storagePath("abc", 2, "报告.xlsx"), "abc/3-statement.xlsx");
  assert.notEqual(storagePath("abc", 0, "a.pdf"), storagePath("abc", 1, "a.pdf"));
  const long = storagePath("abc", 0, `${"x".repeat(500)}.pdf`);
  assert.ok(long.length < 100);
  assert.match(storagePath("abc", 0, "a b/c\\d.pdf"), /^abc\/[A-Za-z0-9._-]+$/);
});

// The open-source copy has one schema file instead of numbered migrations.
const hasMigrations = readdirSync(new URL("../../supabase/", import.meta.url)).some((f) => f.endsWith("_revenue_verification_files.sql"));

test("the migration creates the same private bucket with the same limits", { skip: hasMigrations ? false : "numbered migrations are not in this copy" }, () => {
  const dir = new URL("../../supabase/", import.meta.url);
  const file = readdirSync(dir).find((f) => f.endsWith("_revenue_verification_files.sql"));
  assert.ok(file, "migration file exists");
  const sql = readFileSync(new URL(file, dir), "utf8");
  assert.ok(sql.includes(`'${REVENUE_VERIFICATION_BUCKET}', '${REVENUE_VERIFICATION_BUCKET}', false, ${MAX_FILE_BYTES}`));
  for (const name of ["a.pdf", "a.doc", "a.docx", "a.xls", "a.xlsx", "a.csv", "a.png", "a.jpg"]) {
    assert.ok(sql.includes(`'${contentTypeFor(name)}'`), name);
  }
});
