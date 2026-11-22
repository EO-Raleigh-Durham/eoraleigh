export function RsvpSpamFields({ token }: { token: string }) {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}
    >
      <label>
        Leave this field empty
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      <input type="hidden" name="rsvp_form_token" value={token} />
    </div>
  );
}
