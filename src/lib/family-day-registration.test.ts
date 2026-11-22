import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  prepareFamilyDayPhotos,
  reencodeFamilyDayPhoto,
  releaseFamilyDayRegistration,
  uploadFamilyDayPhotos,
} from "./family-day-registration.ts";

test("re-encodes Family Day photos without EXIF or other source metadata", async () => {
  const input = await sharp({
    create: {
      width: 32,
      height: 24,
      channels: 3,
      background: "#3D46F2",
    },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Artist: "Private family metadata" } } })
    .toBuffer();

  const output = await reencodeFamilyDayPhoto(input, "image/jpeg");
  const metadata = await sharp(output.data).metadata();

  assert.equal(output.contentType, "image/jpeg");
  assert.equal(output.extension, "jpg");
  assert.equal(output.inputPixels, 32 * 24);
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  assert.equal(metadata.xmp, undefined);
  assert.equal(metadata.iptc, undefined);
});

test("re-encodes PNG photos with a PNG storage contract", async () => {
  const input = await sharp({
    create: {
      width: 12,
      height: 8,
      channels: 4,
      background: "#3D46F2",
    },
  })
    .png()
    .toBuffer();

  const output = await reencodeFamilyDayPhoto(input, "image/png");
  const metadata = await sharp(output.data).metadata();

  assert.equal(output.contentType, "image/png");
  assert.equal(output.extension, "png");
  assert.equal(output.inputPixels, 12 * 8);
  assert.equal(metadata.format, "png");
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  assert.equal(metadata.xmp, undefined);
  assert.equal(metadata.iptc, undefined);
});

test("rejects a JPEG whose declared type is PNG", async () => {
  const jpeg = await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: "white",
    },
  })
    .jpeg()
    .toBuffer();

  await assert.rejects(
    reencodeFamilyDayPhoto(jpeg, "image/png"),
    /does not match its declared file type/i,
  );
});

test("rejects content that is not actually JPEG or PNG", async () => {
  const webp = await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: "white",
    },
  })
    .webp()
    .toBuffer();

  await assert.rejects(
    reencodeFamilyDayPhoto(webp, "image/jpeg"),
    /decoded image must be JPEG or PNG/i,
  );
});

test("skips photos that exceed the party decoded-pixel budget", async () => {
  const input = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: "white",
    },
  })
    .jpeg()
    .toBuffer();

  const prepared = await prepareFamilyDayPhotos(
    [
      { data: input, declaredContentType: "image/jpeg", guestName: "First" },
      { data: input, declaredContentType: "image/jpeg", guestName: "Second" },
    ],
    {
      maxPhotoBytes: 1024 * 1024,
      maxTotalPhotoBytes: 2 * 1024 * 1024,
      maxTotalInputPixels: 150,
    },
  );

  assert.notEqual(prepared.photos[0], null);
  assert.equal(prepared.photos[1], null);
  assert.deepEqual(prepared.failedGuests, ["Second"]);
});

test("uploads only re-encoded photo bytes through the testable upload boundary", async () => {
  const input = await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: "white",
    },
  })
    .jpeg()
    .toBuffer();
  const photo = await reencodeFamilyDayPhoto(input, "image/jpeg");
  const uploads: Array<{ path: string; data: Buffer; contentType: string }> = [];

  const result = await uploadFamilyDayPhotos(
    [{ guestName: "Guest", path: "registration/guest.jpg", photo }],
    async (path, data, contentType) => {
      uploads.push({ path, data, contentType });
      return { ok: true };
    },
    4,
  );

  assert.deepEqual(result, { failedGuests: [], ambiguousPaths: [] });
  assert.equal(uploads[0]?.path, "registration/guest.jpg");
  assert.equal(uploads[0]?.contentType, "image/jpeg");
  assert.deepEqual(uploads[0]?.data, photo.data);
});

test("reports an upload error as ambiguous private storage state", async () => {
  const input = await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: "white",
    },
  })
    .jpeg()
    .toBuffer();
  const photo = await reencodeFamilyDayPhoto(input, "image/jpeg");

  const result = await uploadFamilyDayPhotos(
    [{ guestName: "Guest", path: "registration/guest.jpg", photo }],
    async () => ({ ok: false, error: "upload timed out" }),
    4,
  );

  assert.deepEqual(result, {
    failedGuests: ["Guest"],
    ambiguousPaths: ["registration/guest.jpg"],
  });
});

test("removes private photos before deleting a failed registration", async () => {
  const calls: string[] = [];
  const result = await releaseFamilyDayRegistration({
    photoPaths: ["registration/attendee.jpg"],
    async removePhotos(paths) {
      calls.push(`remove:${paths.join(",")}`);
      return { ok: true };
    },
    async deleteRegistration() {
      calls.push("delete-registration");
      return { ok: true };
    },
  });

  assert.deepEqual(result, { released: true });
  assert.deepEqual(calls, [
    "remove:registration/attendee.jpg",
    "delete-registration",
  ]);
});

test("keeps the registration as the photo owner when storage cleanup fails", async () => {
  let deleted = false;
  const result = await releaseFamilyDayRegistration({
    photoPaths: ["registration/attendee.jpg"],
    async removePhotos() {
      return { ok: false, error: "storage unavailable" };
    },
    async deleteRegistration() {
      deleted = true;
      return { ok: true };
    },
  });

  assert.deepEqual(result, {
    released: false,
    error: "storage unavailable",
  });
  assert.equal(deleted, false);
});

test("keeps the registration when storage cleanup throws", async () => {
  let deleted = false;
  const result = await releaseFamilyDayRegistration({
    photoPaths: ["registration/attendee.jpg"],
    async removePhotos() {
      throw new Error("storage connection lost");
    },
    async deleteRegistration() {
      deleted = true;
      return { ok: true };
    },
  });

  assert.deepEqual(result, {
    released: false,
    error: "storage connection lost",
  });
  assert.equal(deleted, false);
});

test("keeps the registration owner after an ambiguous upload", async () => {
  const calls: string[] = [];
  const result = await releaseFamilyDayRegistration({
    photoPaths: ["registration/attendee.jpg"],
    preserveRegistration: true,
    async removePhotos() {
      calls.push("remove-photo");
      return { ok: true };
    },
    async deleteRegistration() {
      calls.push("delete-registration");
      return { ok: true };
    },
  });

  assert.deepEqual(result, {
    released: false,
    error: "Registration preserved because a private photo upload has an ambiguous outcome",
  });
  assert.deepEqual(calls, ["remove-photo"]);
});

test("reports deletion failures after photo cleanup", async () => {
  const result = await releaseFamilyDayRegistration({
    photoPaths: [],
    async removePhotos() {
      throw new Error("must not be called without photos");
    },
    async deleteRegistration() {
      return { ok: false, error: "database unavailable" };
    },
  });

  assert.deepEqual(result, {
    released: false,
    error: "database unavailable",
  });
});

test("reports thrown registration deletion failures", async () => {
  const result = await releaseFamilyDayRegistration({
    photoPaths: [],
    async removePhotos() {
      throw new Error("must not be called without photos");
    },
    async deleteRegistration() {
      throw new Error("database connection lost");
    },
  });

  assert.deepEqual(result, {
    released: false,
    error: "database connection lost",
  });
});
