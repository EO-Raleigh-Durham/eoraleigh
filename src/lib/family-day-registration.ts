import sharp from "sharp";

const FAMILY_DAY_PHOTO_MAX_DIMENSION = 4096;
const FAMILY_DAY_PHOTO_MAX_INPUT_PIXELS = 20_000_000;

export type FamilyDayPhotoContentType = "image/jpeg" | "image/png";

export type ReencodedFamilyDayPhoto = {
  data: Buffer;
  contentType: FamilyDayPhotoContentType;
  extension: "jpg" | "png";
  inputPixels: number;
};

export type FamilyDayPhotoSource = {
  data: Buffer;
  declaredContentType: FamilyDayPhotoContentType;
  guestName: string;
};

type PrepareFamilyDayPhotosOptions = {
  maxPhotoBytes: number;
  maxTotalPhotoBytes: number;
  maxTotalInputPixels: number;
};

/**
 * Decodes and re-encodes an uploaded photo before it reaches private storage.
 * Sharp strips EXIF, XMP, IPTC, and ICC metadata unless metadata preservation
 * is explicitly requested. rotate() applies EXIF orientation to the pixels
 * before that source metadata is discarded.
 */
export async function reencodeFamilyDayPhoto(
  input: Buffer,
  declaredContentType: FamilyDayPhotoContentType,
  maxInputPixels = FAMILY_DAY_PHOTO_MAX_INPUT_PIXELS,
): Promise<ReencodedFamilyDayPhoto> {
  if (!Number.isInteger(maxInputPixels) || maxInputPixels < 1) {
    throw new Error("Decoded image pixel budget is exhausted");
  }
  const source = sharp(input, {
    failOn: "warning",
    limitInputPixels: Math.min(FAMILY_DAY_PHOTO_MAX_INPUT_PIXELS, maxInputPixels),
    sequentialRead: true,
  });
  const metadata = await source.metadata();

  if (metadata.format !== "jpeg" && metadata.format !== "png") {
    throw new Error("Decoded image must be JPEG or PNG");
  }

  const decodedContentType: FamilyDayPhotoContentType =
    metadata.format === "png" ? "image/png" : "image/jpeg";
  if (decodedContentType !== declaredContentType) {
    throw new Error("Decoded image does not match its declared file type");
  }
  if (!metadata.width || !metadata.height) {
    throw new Error("Decoded image dimensions are unavailable");
  }
  const inputPixels = metadata.width * metadata.height;

  const pipeline = source.rotate().resize({
    width: FAMILY_DAY_PHOTO_MAX_DIMENSION,
    height: FAMILY_DAY_PHOTO_MAX_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (metadata.format === "png") {
    return {
      data: await pipeline.png({ compressionLevel: 9 }).toBuffer(),
      contentType: "image/png",
      extension: "png",
      inputPixels,
    };
  }

  return {
    data: await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer(),
    contentType: "image/jpeg",
    extension: "jpg",
    inputPixels,
  };
}

export async function prepareFamilyDayPhotos(
  sources: Array<FamilyDayPhotoSource | null>,
  options: PrepareFamilyDayPhotosOptions,
): Promise<{
  photos: Array<ReencodedFamilyDayPhoto | null>;
  failedGuests: string[];
}> {
  const photos: Array<ReencodedFamilyDayPhoto | null> = [];
  const failedGuests: string[] = [];
  let totalPhotoBytes = 0;
  let totalInputPixels = 0;

  for (const source of sources) {
    if (!source) {
      photos.push(null);
      continue;
    }

    try {
      const remainingPixels = options.maxTotalInputPixels - totalInputPixels;
      const photo = await reencodeFamilyDayPhoto(
        source.data,
        source.declaredContentType,
        remainingPixels,
      );
      if (
        photo.data.byteLength > options.maxPhotoBytes
        || totalPhotoBytes + photo.data.byteLength > options.maxTotalPhotoBytes
      ) {
        throw new Error("Processed photo byte budget is exhausted");
      }
      totalInputPixels += photo.inputPixels;
      totalPhotoBytes += photo.data.byteLength;
      photos.push(photo);
    } catch {
      photos.push(null);
      failedGuests.push(source.guestName);
    }
  }

  return { photos, failedGuests };
}

type CleanupStepResult =
  | { ok: true }
  | { ok: false; error: string };

type FamilyDayRegistrationRelease = {
  photoPaths: string[];
  removePhotos: (paths: string[]) => Promise<CleanupStepResult>;
  deleteRegistration: () => Promise<CleanupStepResult>;
  preserveRegistration?: boolean;
};

export type FamilyDayRegistrationReleaseResult =
  | { released: true }
  | { released: false; error: string };

/**
 * Removes private objects before deleting their owning registration rows.
 * If storage is unavailable, the database owner stays in place so the
 * objects never become unreferenced private data.
 */
export async function releaseFamilyDayRegistration({
  photoPaths,
  removePhotos,
  deleteRegistration,
  preserveRegistration = false,
}: FamilyDayRegistrationRelease): Promise<FamilyDayRegistrationReleaseResult> {
  if (photoPaths.length > 0) {
    let photoResult: CleanupStepResult;
    try {
      photoResult = await removePhotos(photoPaths);
    } catch (error) {
      return {
        released: false,
        error: error instanceof Error ? error.message : "Private photo cleanup failed",
      };
    }
    if (!photoResult.ok) {
      return { released: false, error: photoResult.error };
    }
  }

  if (preserveRegistration) {
    return {
      released: false,
      error: "Registration preserved because a private photo upload has an ambiguous outcome",
    };
  }

  let registrationResult: CleanupStepResult;
  try {
    registrationResult = await deleteRegistration();
  } catch (error) {
    return {
      released: false,
      error: error instanceof Error ? error.message : "Registration cleanup failed",
    };
  }
  if (!registrationResult.ok) {
    return { released: false, error: registrationResult.error };
  }

  return { released: true };
}

export type FamilyDayPhotoUploadItem = {
  guestName: string;
  path: string | null;
  photo: ReencodedFamilyDayPhoto | null;
};

export async function uploadFamilyDayPhotos(
  items: FamilyDayPhotoUploadItem[],
  upload: (
    path: string,
    data: Buffer,
    contentType: FamilyDayPhotoContentType,
  ) => Promise<CleanupStepResult>,
  concurrency: number,
): Promise<{ failedGuests: string[]; ambiguousPaths: string[] }> {
  const failedGuests: string[] = [];
  const ambiguousPaths: string[] = [];
  const batchSize = Number.isFinite(concurrency)
    ? Math.max(1, Math.floor(concurrency))
    : 1;

  for (let start = 0; start < items.length; start += batchSize) {
    const results = await Promise.all(
      items.slice(start, start + batchSize).map(async (item) => {
        if (!item.photo || !item.path) return null;
        const failedUpload = { guestName: item.guestName, path: item.path };
        try {
          const result = await upload(
            item.path,
            item.photo.data,
            item.photo.contentType,
          );
          return result.ok ? null : failedUpload;
        } catch {
          return failedUpload;
        }
      }),
    );

    for (const item of results) {
      if (!item) continue;
      failedGuests.push(item.guestName);
      ambiguousPaths.push(item.path);
    }
  }

  return { failedGuests, ambiguousPaths };
}
