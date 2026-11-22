import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedSurveyBySlug } from "@/lib/surveys";
import { SurveyStepper } from "./SurveyStepper";
import { surveyShareCopy } from "./share";
import { CHAPTER_NAME, CHAPTER_SITE_URL } from "@/kernel/config/chapter";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const survey = await getPublishedSurveyBySlug(slug);
  const title = survey ? survey.name : "Survey";
  const { description } = surveyShareCopy(slug, survey?.name ?? null);
  const url = `/survey/${slug}`;
  // Absolute www URL: the apex domain 308-redirects to www, and WhatsApp
  // drops preview images that sit behind a redirect.
  const image = `${CHAPTER_SITE_URL}${url}/opengraph-image`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: CHAPTER_NAME,
      title: `${title} · ${CHAPTER_NAME}`,
      description,
      url,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${CHAPTER_NAME}`,
      description,
      images: [image],
    },
    robots: { index: false, follow: false },
  };
}

export default async function SurveyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const survey = await getPublishedSurveyBySlug(slug);
  if (!survey) notFound();

  return (
    <SurveyStepper
      survey={{
        slug: survey.slug,
        name: survey.name,
        intro_text: survey.intro_text,
        thank_you_text: survey.thank_you_text,
        fields: survey.fields,
      }}
    />
  );
}
