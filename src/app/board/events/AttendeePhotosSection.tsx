import { requireBoardOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { EventRegistration } from "@/lib/events";
import { ATTENDEE_PHOTOS_PURPOSE } from "@/content/attendee-photos";

const MYEO_FAMILY_DAY_PHOTO_BUCKET = "family-day-attendee-photos";
// Short-lived on purpose: this bucket has zero client-facing policies by
// design (migration 085), so every view of a photo re-authorizes through
// requireBoardOrAbove() and mints a fresh URL rather than caching a
// long-lived one anywhere.
const SIGNED_URL_TTL_SECONDS = 300;

type AttendeePhoto = {
  attendeeId: string;
  registrationId: string;
  fullName: string;
  age: number | null;
  familyLabel: string;
  signedUrl: string | null;
};

// Server component: lists every attendee photo on file for this event, one
// signed URL per photo, generated fresh on each render behind board auth.
// Renders nothing when the event has no photos (only MyEO Family Day does,
// today), so it is safe to mount unconditionally on every event's page.
export async function AttendeePhotosSection({
  registrations,
}: {
  registrations: EventRegistration[];
}) {
  await requireBoardOrAbove();

  const withPhotos = registrations.flatMap((registration) => {
    const familyLabel = registration.person?.name || registration.person?.email || "Guest";
    return (registration.attendees ?? [])
      .filter((attendee) => attendee.photo_path && attendee.photo_consent)
      .map((attendee, index, all) => ({
        attendeeId: attendee.id,
        registrationId: registration.id,
        fullName: attendee.full_name,
        age: attendee.age ?? null,
        // "Family · Guest N" only when there's more than one photographed
        // guest in the registration, so a solo registrant doesn't see a
        // pointless "Guest 1".
        familyLabel: all.length > 1 ? `${familyLabel} · Guest ${index + 1}` : familyLabel,
        photoPath: attendee.photo_path as string,
      }));
  });

  if (withPhotos.length === 0) return null;

  const signed = await Promise.all(
    withPhotos.map(async (row): Promise<AttendeePhoto> => {
      const { data, error } = await supabase.storage
        .from(MYEO_FAMILY_DAY_PHOTO_BUCKET)
        .createSignedUrl(row.photoPath, SIGNED_URL_TTL_SECONDS);
      if (error) {
        console.warn("AttendeePhotosSection signed URL:", error.message);
      }
      return {
        attendeeId: row.attendeeId,
        registrationId: row.registrationId,
        fullName: row.fullName,
        age: row.age,
        familyLabel: row.familyLabel,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <h2 className="admin-section-h2">Attendee photos ({signed.length})</h2>
      </div>
      <p className="admin-section-desc">
        {ATTENDEE_PHOTOS_PURPOSE} Only guests who
        ticked photo consent appear here. Links expire in 5 minutes; reload
        the page for a fresh one.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {signed.map((photo) => (
          <div
            key={photo.attendeeId}
            className="admin-stub"
            style={{ padding: 12, textAlign: "left" }}
          >
            {photo.signedUrl ? (
              <a href={photo.signedUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, not a static asset Next can optimize */}
                <img
                  src={photo.signedUrl}
                  alt={`Photo of ${photo.fullName}`}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    borderRadius: 8,
                    display: "block",
                  }}
                />
              </a>
            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: 8,
                  background: "var(--ink-100, #eee)",
                }}
              />
            )}
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>
              {photo.familyLabel}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {photo.fullName}
              {photo.age != null ? `, age ${photo.age}` : ""}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
