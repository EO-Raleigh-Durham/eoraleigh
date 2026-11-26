// Server-only. The connector's chapter photo tools: find and look at photos,
// add one, fix its caption, take it down. Area "photos" (./access.ts): every
// board member and super admin reads and writes it, as on /board/photos;
// contractors never see it.
//
// Every change calls the same function the website's photo actions call
// (src/lib/chapter-photos-server.ts): the same upload path check, re-encode
// without location data, marketing permission record and "uploader or board"
// delete rule. Adding a photo is the website's two steps: photo_upload_link
// hands out a private upload link, then photo_add checks what arrived and
// saves it with the person's marketing permission.
//
// Data modules load lazily, inside each tool's body, so this file can be
// imported by the unit tests without a database.
import { z } from "zod";
import {
  MARKETING_CONSENT_LABEL,
  MARKETING_CONSENT_TERMS,
  MAX_CAPTION_LENGTH,
  MAX_PHOTO_BYTES,
  PHOTO_CONTENT_TYPES,
  cleanCaption,
  ownsUploadPath,
  refusePhoto,
  uploadPath,
} from "../chapter-photos.ts";
import { CHAPTER_TIME_ZONE } from "../../kernel/config/chapter.ts";
import type { McpCaller } from "./caller";
import { untrusted, writeTool, type Tool } from "./tools-core.ts";

const photosData = () => import("../chapter-photos-server");

const ID = z.string().uuid("Use the photoId from photos_list");
const CONTENT_TYPES = Object.keys(PHOTO_CONTENT_TYPES) as [string, ...string[]];
const UPLOAD_PAGE = "/member/photos/upload";

type GalleryPhoto = Awaited<ReturnType<Awaited<ReturnType<typeof photosData>>["listGalleryPhotos"]>>[number];

function shown(p: GalleryPhoto) {
  return {
    photoId: p.id,
    caption: untrusted(p.caption),
    uploadedBy: p.uploadedBy,
    uploaderEmail: p.uploaderEmail,
    uploadedAt: p.createdAt,
    marketingConsent: p.marketingConsent,
    viaPublicUpload: p.viaPublicUpload,
    emailMatchesMember: p.emailMatchesMember,
    width: p.width,
    height: p.height,
    thumbUrl: p.thumbUrl,
    fullUrl: p.fullUrl,
  };
}

/** One photo, for a preview or the photo tool; null when there is none. */
async function onePhoto(id: string): Promise<GalleryPhoto | null> {
  const { listGalleryPhotos } = await photosData();
  return (await listGalleryPhotos({ id, limit: 1, includeEmail: true }))[0] ?? null;
}

function described(p: GalleryPhoto): string {
  const day = new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: CHAPTER_TIME_ZONE });
  return `the photo ${p.uploadedBy ? `${p.uploadedBy} uploaded` : "uploaded"} on ${day}`;
}

const listInput = z.object({
  search: z.string().trim().max(200).optional(),
  consentOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const uploadLinkInput = z.object({
  fileName: z.string().trim().min(1, "Name the file").max(200),
  contentType: z.enum(CONTENT_TYPES, { message: "Photos must be JPG, PNG, WebP or GIF" }),
  sizeBytes: z.number().int().positive("Give the file's size in bytes"),
});

const addInput = z.object({
  path: z.string().min(1, "Use the path photo_upload_link returned"),
  caption: z.string().max(MAX_CAPTION_LENGTH).optional(),
  marketingConsent: z.literal(true, { message: "The person must give the marketing permission to add a photo" }),
});

const captionInput = z.object({
  photoId: ID,
  caption: z.string().max(MAX_CAPTION_LENGTH),
});

const removeInput = z.object({ photoId: ID });

export function photoTools(caller: McpCaller, origin: string): Tool[] {
  const user = caller.user;

  return [
    {
      name: "photos_list",
      area: "photos",
      title: "Photos: the chapter gallery",
      description:
        "Photos in the chapter gallery (/member/photos), newest first: caption, who uploaded them and when, " +
        "whether they gave marketing permission, and links to the thumbnail and full photo (good for an hour). " +
        "search matches the caption, the uploader's name or email. Photos without marketing permission must not be used in marketing.",
      readOnly: true,
      input: listInput as unknown as z.ZodType<Record<string, unknown>>,
      inputJsonSchema: {
        type: "object",
        properties: {
          search: { type: "string", description: "Words in the caption, or the uploader's name or email." },
          consentOnly: { type: "boolean", description: "Only photos whose uploader gave marketing permission." },
          limit: { type: "integer", minimum: 1, maximum: 100, description: "How many to return. Defaults to 30." },
        },
      },
      run: async (raw) => {
        const parsed = listInput.safeParse(raw);
        if (!parsed.success) return { error: `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}` };
        const { search, consentOnly, limit = 30 } = parsed.data;
        const { listGalleryPhotos } = await photosData();
        const needle = search?.toLowerCase();
        const matches = (await listGalleryPhotos({ includeEmail: true })).filter(
          (p) =>
            (!consentOnly || p.marketingConsent) &&
            (!needle || [p.caption, p.uploadedBy, p.uploaderEmail].some((t) => t?.toLowerCase().includes(needle))),
        );
        return { total: matches.length, photos: matches.slice(0, limit).map(shown), gallery: `${origin}/board/photos` };
      },
    },
    {
      name: "photo",
      area: "photos",
      title: "Photos: one photo",
      description: "One gallery photo's details and links (good for an hour), by its photoId from photos_list.",
      readOnly: true,
      input: removeInput as unknown as z.ZodType<Record<string, unknown>>,
      inputJsonSchema: {
        type: "object",
        properties: { photoId: { type: "string", description: "The photoId from photos_list." } },
        required: ["photoId"],
      },
      run: async (raw) => {
        const parsed = removeInput.safeParse(raw);
        if (!parsed.success) return { error: `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}` };
        const p = await onePhoto(parsed.data.photoId);
        return p ? shown(p) : { error: "Photo not found." };
      },
    },
    {
      name: "photo_upload_link",
      area: "photos",
      title: "Photos: get an upload link",
      description:
        "Step 1 of adding a photo. Returns a private, one-use link to send one JPG, PNG, WebP or GIF " +
        `(up to ${MAX_PHOTO_BYTES / 1024 / 1024} MB) to, and the path to pass to photo_add. Nothing is in the gallery until photo_add. ` +
        `If you cannot send a file to a link from here, give the person the website's upload page (${origin}${UPLOAD_PAGE}) instead.`,
      readOnly: true,
      input: uploadLinkInput as unknown as z.ZodType<Record<string, unknown>>,
      inputJsonSchema: {
        type: "object",
        properties: {
          fileName: { type: "string", description: "The photo's file name, e.g. gala-2026.jpg." },
          contentType: { type: "string", enum: CONTENT_TYPES, description: "The photo's type." },
          sizeBytes: { type: "integer", description: "The file's size in bytes." },
        },
        required: ["fileName", "contentType", "sizeBytes"],
      },
      run: async (raw) => {
        const parsed = uploadLinkInput.safeParse(raw);
        if (!parsed.success) return { error: `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}` };
        const f = parsed.data;
        const refusal = refusePhoto({ name: f.fileName, type: f.contentType, size: f.sizeBytes });
        if (refusal) return { error: refusal };
        const path = uploadPath(user.userId, crypto.randomUUID(), f.contentType);
        const { createUploadTicket } = await photosData();
        const ticket = await createUploadTicket(path);
        if (!ticket) return { error: "Could not start this upload. Try again." };
        return {
          path,
          uploadUrl: ticket.signedUrl,
          how: `PUT the file's bytes to uploadUrl with header Content-Type: ${f.contentType}, e.g. curl -X PUT -H "Content-Type: ${f.contentType}" --data-binary @${f.fileName.replace(/[^\w.-]/g, "_")} "<uploadUrl>"`,
          next: "When the upload succeeds, call photo_add with this path, a caption if any, and the person's marketing permission.",
          websiteUpload: `${origin}${UPLOAD_PAGE}`,
        };
      },
    },
    writeTool(caller, {
      name: "photo_add",
      area: "photos",
      title: "Photos: add an uploaded photo",
      description:
        "Step 2 of adding a photo: checks the file sent to photo_upload_link's link is really a photo, removes its location and other hidden data, " +
        "and adds it to the gallery as uploaded by you. Needs your marketing permission: show the person the permission and terms in the preview " +
        "and set marketingConsent only on their clear yes.",
      input: addInput,
      properties: {
        path: { type: "string", description: "The path photo_upload_link returned." },
        caption: { type: "string", description: `A caption, up to ${MAX_CAPTION_LENGTH} characters.` },
        marketingConsent: { type: "boolean", enum: [true], description: "True only when the person agrees to the marketing permission and terms." },
      },
      required: ["path", "marketingConsent"],
      plan: async (f) => {
        if (!ownsUploadPath(user.userId, f.path)) return { error: "That upload doesn't belong to you. Get a new link with photo_upload_link." };
        const caption = cleanCaption(f.caption);
        return {
          summary: `Add a photo to the gallery as uploaded by ${user.fullName ?? user.email}${caption ? `, captioned "${caption}"` : ", with no caption"}`,
          warnings: [`Saying yes gives this permission as the uploader: ${MARKETING_CONSENT_LABEL}`],
          details: { permission: MARKETING_CONSENT_LABEL, terms: MARKETING_CONSENT_TERMS },
        };
      },
      apply: async (f) => {
        const { saveUploadedPhoto } = await photosData();
        const saved = await saveUploadedPhoto(user, f.path, f.caption ?? "");
        if (!saved.ok) throw new Error(saved.error);
        return { photoId: saved.id, gallery: `${origin}/member/photos` };
      },
    }),
    writeTool(caller, {
      name: "photo_set_caption",
      area: "photos",
      title: "Photos: change a caption",
      description: "Sets a gallery photo's caption, as on /board/photos. An empty caption clears it.",
      input: captionInput,
      properties: {
        photoId: { type: "string", description: "The photoId from photos_list." },
        caption: { type: "string", description: `The new caption, up to ${MAX_CAPTION_LENGTH} characters. Empty clears it.` },
      },
      required: ["photoId", "caption"],
      plan: async (f) => {
        const p = await onePhoto(f.photoId);
        if (!p) return { error: "Photo not found." };
        const next = cleanCaption(f.caption);
        if (next === p.caption) return { error: "That is already the caption." };
        return {
          summary: next
            ? `Caption on ${described(p)} becomes "${next}"`
            : `Clear the caption on ${described(p)}`,
          warnings: [],
          details: { currentCaption: untrusted(p.caption), thumbUrl: p.thumbUrl },
        };
      },
      apply: async (f) => {
        const { setPhotoCaption } = await photosData();
        const saved = await setPhotoCaption(f.photoId, f.caption);
        if (!saved.ok) throw new Error(saved.error);
        return { photoId: f.photoId, caption: saved.caption };
      },
    }),
    writeTool(caller, {
      name: "photo_remove",
      area: "photos",
      title: "Photos: delete a photo",
      description: "Deletes a photo from the gallery and its files from storage, as the delete button on the gallery does.",
      destructive: true,
      input: removeInput,
      properties: { photoId: { type: "string", description: "The photoId from photos_list." } },
      required: ["photoId"],
      plan: async (f) => {
        const p = await onePhoto(f.photoId);
        if (!p) return { error: "Photo not found." };
        return {
          summary: `Delete ${described(p)}`,
          warnings: ["This deletes the photo and its files for good. It cannot be undone."],
          details: { caption: untrusted(p.caption), thumbUrl: p.thumbUrl },
        };
      },
      apply: async (f) => {
        const { deleteChapterPhoto } = await photosData();
        const done = await deleteChapterPhoto(user, f.photoId);
        if (!done.ok) throw new Error(done.error);
        return { photoId: f.photoId, deleted: true };
      },
    }),
  ];
}
