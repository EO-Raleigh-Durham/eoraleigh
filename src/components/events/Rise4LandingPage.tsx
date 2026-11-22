// Stand-in for a one-off landing page that belongs to another chapter's
// event. It keeps the same props so the shared event page compiles, and
// renders nothing. Build your own landing page component if an event needs one.

type Props = {
  dateLabel: string;
  timeRange: string;
  startsAt: string;
  isPast: boolean;
  guestPriceDisplay: string | null;
  seatLimit: number;
};

export function Rise4LandingPage(props: Props) {
  void props;
  return null;
}
