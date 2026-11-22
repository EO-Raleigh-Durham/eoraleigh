// The chapter's podcast episodes, newest first. Add your own episodes here;
// with an empty list the podcast page and the homepage feature show no
// episode cards.

export type Episode = {
  ep: number;
  date: string;
  duration: string;
  title: string;
  guest: string;
  tags: string[];
  thumb: string | null;
  url?: string;
};

export const EPISODES: Episode[] = [];

export function getLatestEpisode(episodes: readonly Episode[] = EPISODES): Episode {
  if (episodes.length === 0) {
    throw new Error("Cannot select the latest episode from an empty list");
  }

  return episodes.reduce((latest, episode) => {
    const dateDifference = Date.parse(episode.date) - Date.parse(latest.date);
    return dateDifference > 0 || (dateDifference === 0 && episode.ep > latest.ep)
      ? episode
      : latest;
  });
}
