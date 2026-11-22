import Link from "next/link";
import { CHAPTER_COUNTRY, CHAPTER_NAME, CHAPTER_PARTNERS_EMAIL, CHAPTER_PRIVACY_EMAIL } from "@/kernel/config/chapter";

// The chapter's privacy policy text, shown on /privacy.
//
// THIS IS A GENERIC STARTING DRAFT, NOT LEGAL ADVICE. Data-protection law
// differs by country. Before you publish, review this text with counsel in
// your chapter's country, name the local law and regulator in section 5, and
// check the retention periods in section 7 against local tax and records law.

export const PRIVACY_LAST_UPDATED = "Not yet reviewed";

export const PRIVACY_META_DESCRIPTION = `How ${CHAPTER_NAME} collects, uses, and protects your personal information.`;

export const PRIVACY_LEAD = `${CHAPTER_NAME} takes confidentiality seriously, in Forum and outside it. This page explains what we collect, what we do with it, and the rights you have over your personal data.`;

const CONTACT_EMAIL = CHAPTER_PRIVACY_EMAIL;

export function PrivacyPolicyArticle() {
  return (
    <article className="legal-prose">
      <h2>1. Who we are</h2>
      <p>
        This site is operated by <strong>{CHAPTER_NAME}</strong>, {CHAPTER_COUNTRY ? <>the {CHAPTER_COUNTRY} chapter</> : <>a chapter</>} of Entrepreneurs&apos; Organization, a global non-profit network of entrepreneurs. {CHAPTER_NAME} is the data controller for the personal information described below.
      </p>
      {CONTACT_EMAIL && (
        <p>
          Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      )}

      <h2>2. What we collect</h2>
      <p>We collect personal data in these contexts on this site:</p>
      <ul>
        <li>
          <strong>Membership applications</strong> (<Link href="/join">Join EO</Link>): name, email, phone, city, company, role, industry, annual revenue range, and the reason you want to join.
        </li>
        <li>
          <strong>Member directory</strong> (<Link href="/directory">Member directory</Link>): name, company, role, city and industry. Contact details are shown only to signed-in members.
        </li>
        <li>
          <strong>Podcast guest applications</strong> (<Link href="/podcast">Podcast</Link>): name, email, company, annual revenue, and a short pitch.
        </li>
        <li>
          <strong>Partnership inquiries</strong> (<Link href="/partners">Partners</Link>): emails you send to {CHAPTER_PARTNERS_EMAIL ? <a href={`mailto:${CHAPTER_PARTNERS_EMAIL}`}>{CHAPTER_PARTNERS_EMAIL}</a> : "the chapter"}.
        </li>
        <li>
          <strong>Event registrations</strong> (<Link href="/events">Events</Link>, <Link href="/community-events">Community events</Link>): name, email, RSVP details, and, for paid programs, billing information processed by our payment provider.
        </li>
      </ul>
      <p>
        We also receive basic technical data through standard server logs, such as IP address, browser type and pages visited, used only to detect abuse and keep the site running.
      </p>

      <h2>3. How we use it</h2>
      <ul>
        <li>To review your membership application and contact you about next steps.</li>
        <li>To run the chapter: member events, learning sessions, Forum and signature programs.</li>
        <li>To process payments for paid programs and events.</li>
        <li>To produce the podcast and respond to guest pitches.</li>
        <li>To respond to partnership inquiries and operate active partnerships.</li>
        <li>To send transactional and chapter-related communications.</li>
      </ul>

      <h2>4. Who we share data with</h2>
      <p>We share personal data only with the parties needed to deliver the services above:</p>
      <ul>
        <li>
          <strong>EO Global</strong> (Entrepreneurs&apos; Organization, Inc., USA): membership records flow to EO&apos;s global member system, which gives you access to chapters worldwide.
        </li>
        <li>
          <strong>Payment processor</strong> (Stripe, Inc.): for paid program registrations and event tickets. Card details are handled by Stripe and never stored on our servers.
        </li>
        <li>
          <strong>Hosting and infrastructure</strong>: this site runs on Vercel, and the membership and event database is hosted on Supabase.
        </li>
        <li>
          <strong>Email and operations</strong>: service providers we use to send email and manage applications, member relationships and event attendance.
        </li>
      </ul>
      <p>We do not sell personal data, and we do not share data with advertising networks.</p>

      <h2>5. Your rights</h2>
      <p>
        Depending on the data-protection law that applies to you, you may have the following rights regarding personal data we hold about you:
      </p>
      <ul>
        <li>The right to be informed about how your data is used.</li>
        <li>The right to access a copy of your data.</li>
        <li>The right to correct inaccurate data.</li>
        <li>The right to delete data, subject to legal and contractual retention requirements.</li>
        <li>The right to restrict or object to processing.</li>
        <li>The right to withdraw consent at any time, where processing is based on consent.</li>
        <li>The right to portability of data you have provided to us.</li>
        <li>The right to lodge a complaint with your local data-protection authority.</li>
      </ul>
      <p>
        To exercise any of these rights, {CONTACT_EMAIL ? <>email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></> : "contact the chapter"}. We respond within thirty days.
      </p>

      <h2>6. Cookies and analytics</h2>
      <p>
        We use the minimum cookies required to operate the site (session and security). We do not run advertising cookies or third-party trackers. Our hosting provider records aggregated, anonymized request metrics to keep the site fast and stable.
      </p>

      <h2>7. Data retention</h2>
      <ul>
        <li><strong>Application data</strong> for accepted members: retained for the duration of membership and for a period afterwards for accounting and EO Global reporting.</li>
        <li><strong>Application data</strong> for declined applications: retained for one year, then deleted, unless you ask us to delete it sooner.</li>
        <li><strong>Event registration data</strong>: retained for two years after the event.</li>
        <li><strong>Payment records</strong>: retained for as long as local tax law requires.</li>
        <li><strong>Podcast guest applications</strong>: retained for two years.</li>
      </ul>

      <h2>8. International transfers</h2>
      <p>
        Some of our service providers are based in other countries. Where personal data is transferred internationally, we rely on the contractual safeguards required by applicable law.
      </p>

      <h2>9. Security</h2>
      <p>
        We use industry-standard technical and organizational safeguards: encrypted connections (TLS), encrypted databases at rest, least-privilege access for chapter staff, and a server-only secret key for the application database. Access to the member directory is restricted to signed-in members.
      </p>
      <p>
        No internet system is perfectly secure. If we discover a breach affecting your data, we will notify you and the relevant authority as the law requires.
      </p>

      <h2>10. Children</h2>
      <p>
        {CHAPTER_NAME} membership is for entrepreneurs running businesses with US$1M+ annual revenue. The site is not directed at, and we do not knowingly collect personal data from, anyone under the age of eighteen.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. The &quot;Last updated&quot; date at the top of the page reflects the most recent change.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions, requests, or complaints about this policy or your data can go to {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : "the chapter"}.
      </p>
    </article>
  );
}
