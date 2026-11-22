import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { MarketingChrome } from "@/components/MarketingChrome";
import { AttributionCapture } from "@/components/AttributionCapture";
import { getSessionUser } from "@/lib/auth";
import { robotsFor } from "@/lib/access-map";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/page-metadata";
import "./globals.css";
import {
  CHAPTER_CHAT_URL,
  CHAPTER_CITY,
  CHAPTER_CONTACT_EMAIL,
  CHAPTER_COUNTRY,
  CHAPTER_COUNTRY_CODE,
  CHAPTER_NAME,
} from "@/kernel/config/chapter";

// Re-exported so existing importers (e.g. events/[id]) keep working.
export { DEFAULT_OG_IMAGE };

// Fonts are committed in ./fonts (variable woff2, extended Latin) instead of
// next/font/google, whose build-time download made Vercel builds fail without the
// build cache. See ./fonts/README.md for how the files were made.
const roboto = localFont({
  src: "./fonts/roboto-latin-vietnamese.woff2",
  weight: "300 900",
  display: "swap",
  variable: "--font-roboto",
});
const robotoMono = localFont({
  src: "./fonts/roboto-mono-latin-vietnamese.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-roboto-mono",
  adjustFontFallback: false,
});
const robotoSerif = localFont({
  src: "./fonts/roboto-serif-latin-vietnamese.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-roboto-serif",
  adjustFontFallback: "Times New Roman",
});

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: CHAPTER_NAME,
  alternateName: `Entrepreneurs' Organization ${CHAPTER_COUNTRY}`,
  url: SITE_URL,
  logo: `${SITE_URL}/logo/primary.svg`,
  description:
    `${CHAPTER_NAME} is the founder peer community for entrepreneurs running $1M+ businesses, the local chapter of Entrepreneurs' Organization.`,
  parentOrganization: {
    "@type": "Organization",
    name: "Entrepreneurs' Organization",
    url: "https://eonetwork.org",
  },
  sameAs: [
    "https://eonetwork.org",
    "https://eoapac.com",
    ...(CHAPTER_CHAT_URL ? [CHAPTER_CHAT_URL] : []),
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Membership inquiries",
    email: CHAPTER_CONTACT_EMAIL,
    ...(CHAPTER_COUNTRY_CODE ? { areaServed: CHAPTER_COUNTRY_CODE } : {}),
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${CHAPTER_NAME} · Master Growth, Multiply Impact`,
    template: `%s · ${CHAPTER_NAME}`,
  },
  description:
    `${CHAPTER_NAME}, a private community of 7-figure founders. Part of Entrepreneurs' Organization, 20,000+ members in 61 countries.`,
  applicationName: CHAPTER_NAME,
  authors: [{ name: CHAPTER_NAME }],
  creator: CHAPTER_NAME,
  publisher: `Entrepreneurs' Organization ${CHAPTER_COUNTRY} Chapter`,
  keywords: [
    CHAPTER_NAME,
    `Entrepreneurs Organization ${CHAPTER_COUNTRY}`,
    `${CHAPTER_COUNTRY} founders network`,
    `founder community ${CHAPTER_COUNTRY}`,
    "EO Forum",
    "EO membership",
    `${CHAPTER_CITY} entrepreneurs`,
    "business peer group",
  ],
  openGraph: {
    type: "website",
    siteName: CHAPTER_NAME,
    title: `${CHAPTER_NAME} · Master Growth, Multiply Impact`,
    description:
      `A private community of 7-figure founders in ${CHAPTER_COUNTRY}, part of a 20,000-member global network across 61 countries.`,
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${CHAPTER_NAME} · Master Growth, Multiply Impact`,
    description:
      `A private community of 7-figure founders in ${CHAPTER_COUNTRY}, part of a 20,000-member global network.`,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: robotsFor("public"),
  category: "business",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0C31" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser = await getSessionUser();
  const topbarUser = sessionUser
    ? { fullName: sessionUser.fullName, email: sessionUser.email, role: sessionUser.role }
    : null;

  return (
    <html
      lang="en"
      className={`${roboto.variable} ${robotoMono.variable} ${robotoSerif.variable}`}
    >
      <body>
        <AttributionCapture />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
        <div className="page">
          <MarketingChrome user={topbarUser}>{children}</MarketingChrome>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
