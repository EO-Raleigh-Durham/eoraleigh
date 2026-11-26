// The chapter's Strategic Alliance Partners and their member benefits, shown
// on /partners. Add your partners here.

export type Partner = {
  name: string;
  benefit: string;
  contact: string;
};

export const SAPS: Partner[] = [
  {
    name: "RHA Wealth",
    benefit:
      "Customized wealth management: a financial strategy built around your goals, implemented and monitored over time while managing investment risk.",
    contact: "linkedin.com/company/rhawealth",
  },
  {
    name: "WorkSmart",
    benefit:
      "Managed IT services for small and mid-sized businesses: secure, reliable infrastructure, support when issues arise and guidance on making IT serve your goals.",
    contact: "Ask the chapter office for an introduction",
  },
  {
    name: "Bell Leadership",
    benefit:
      "Leadership development and executive education for more than 50 years, helping leaders and their organizations execute their vision and strategy.",
    contact: "bellleadership.com",
  },
  {
    name: "Close HR Connections",
    benefit:
      "Fractional, onsite people management and HR, from a woman-owned firm serving a wide range of industries since 2009.",
    contact: "closehr.com",
  },
  {
    name: "Rankin McKenzie",
    benefit:
      "Part-time CFO and Controller talent, so you have the right financial people when you need them until you are ready for a full-time hire.",
    contact: "Ask the chapter office for an introduction",
  },
  {
    name: "Culture Index",
    benefit:
      "Strategic advisory for CEOs scaling their organizations with applied people analytics instead of instinct.",
    contact: "linkedin.com/company/culture-index",
  },
  {
    name: "EOS Implementer Paul Levering",
    benefit:
      "Certified EOS Implementer who helps leadership teams put the Entrepreneurial Operating System to work, drawing on 15 years as an EO member.",
    contact: "eosworldwide.com/paul-levering",
  },
  {
    name: "Fourscore Business Law",
    benefit:
      "Business law for companies at every stage, from formation and financing through scaling and exit, often as outside general counsel.",
    contact: "fourscorelaw.com",
  },
  {
    name: "Gallagher Insurance",
    benefit:
      "Insurance brokerage, risk management and consulting with customized solutions from a local team backed by a global firm.",
    contact: "ajg.com",
  },
];
