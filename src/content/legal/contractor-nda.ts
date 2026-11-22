// Contractor Non-Disclosure Agreement shown on a contractor's first sign-in.
// Bump CONTRACTOR_NDA_VERSION whenever the text changes in substance: every
// contractor must then accept the new version before their access resumes.
//
// THIS IS A GENERIC STARTING DRAFT, NOT LEGAL ADVICE. Have your chapter's
// board and counsel in your country review it before you rely on it.

// Same value as CHAPTER_NAME in src/kernel/config/chapter.ts. Read directly so
// this module stays import-free for the node unit tests that load it.
// The guard keeps it loadable in sandboxes without `process` (guardrail tests).
const CHAPTER_NAME =
  (typeof process === "undefined" ? "" : (process.env.NEXT_PUBLIC_ORG_NAME ?? "")).trim() || "EO Chapter";

export const CONTRACTOR_NDA_VERSION = "v1";

export const CONTRACTOR_NDA_TITLE = "Contractor Non-Disclosure Agreement";

export const CONTRACTOR_NDA_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. Parties and purpose",
    body:
      `This agreement is between ${CHAPTER_NAME}, a chapter of Entrepreneurs' Organization, and you, the contractor named below. ${CHAPTER_NAME} is giving you access to its member platform so you can help a board member with a specific area of work. You may use that access only for that work.`,
  },
  {
    heading: "2. Confidential information",
    body:
      `Everything you can see or download through your access is confidential. This includes names, contact details and notes about members, partners, sponsors and prospects, deal values and terms, meeting notes, and anything else about ${CHAPTER_NAME}'s members, partners or operations. Information remains confidential even if it is not marked as such.`,
  },
  {
    heading: "3. What you must not do",
    body:
      `You must not share, publish, sell or give confidential information to anyone outside your approved work for ${CHAPTER_NAME}. You must not copy it into personal files, spreadsheets, CRMs or other systems. You must not paste, upload or otherwise enter it into any AI tool, chatbot or AI service (for example ChatGPT, Claude, Gemini or Copilot), or into any other third-party service. You must not use it to contact anyone for your own purposes or for anyone other than ${CHAPTER_NAME}.`,
  },
  {
    heading: "4. How you must protect it",
    body:
      `Keep your login private and do not share your account. Access the platform only on devices you control and that are kept secure. Tell your ${CHAPTER_NAME} sponsor straight away if you believe confidential information has been lost, shared or accessed by someone who should not have it.`,
  },
  {
    heading: "5. When your access ends",
    body:
      `Your access ends on its expiry date or when ${CHAPTER_NAME} revokes it, whichever comes first. When it ends, you must delete or return any confidential information you hold. Your duties under this agreement continue after your access ends.`,
  },
  {
    heading: "6. Breach",
    body:
      `If you break this agreement, ${CHAPTER_NAME} may end your access immediately and may take any action available to it under applicable law.`,
  },
  {
    heading: "7. Acceptance",
    body:
      `By ticking the box, typing your full name and selecting Accept, you confirm that you have read and understood this agreement and agree to it. ${CHAPTER_NAME} records the date, time, version and network address of your acceptance.`,
  },
];
