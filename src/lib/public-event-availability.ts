export function publicEventAvailability(
  capacity: number | null,
  occupiedSeats: number,
): string | null {
  if (capacity === null) return null;
  if (occupiedSeats >= capacity) return "Waitlist open";

  const fillRatio = occupiedSeats / capacity;
  if (fillRatio >= 0.9) return "Final places available";
  if (fillRatio >= 0.8) return "Limited availability";

  return `Limited to ${capacity} participants`;
}
