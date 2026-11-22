import type { Metadata } from "next";
import { HeroEditorial } from "@/components/home/HeroEditorial";
import { StatsRibbon } from "@/components/home/StatsRibbon";
import { WhyJoin } from "@/components/home/WhyJoin";
import { ProgramsGrid } from "@/components/home/ProgramsGrid";
import { MemberWords } from "@/components/home/MemberWords";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { PodcastFeature } from "@/components/home/PodcastFeature";
import { NewsBlock } from "@/components/home/NewsBlock";
import { FinalCTA } from "@/components/home/FinalCTA";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "A Private Community of 7-Figure Founders",
  description:
    `${CHAPTER_NAME} is the founder peer community for entrepreneurs running $1M+ businesses. Forum, signature events, and access to 20,000 EO members in 61 countries.`,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="home">
      <HeroEditorial />
      <StatsRibbon />
      <WhyJoin />
      <ProgramsGrid />
      <MemberWords />
      <UpcomingEvents />
      <PodcastFeature />
      <NewsBlock />
      <FinalCTA />
    </div>
  );
}
