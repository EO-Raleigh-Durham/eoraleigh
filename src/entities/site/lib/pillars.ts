// The chapter app's version of edge8-web's entities/site/lib/pillars.ts (EO-owned).
// Pillar slugs and theses are the chapter's content pillars (migration 104).
// A thesis is looked up by slug, so one for a pillar a chapter does not have
// is never shown.
import type { PostMeta } from '@/entities/site/lib/postData'
import { CHAPTER_NAME } from '@/kernel/config/chapter'

export type Pillar = { slug: string; name: string; count: number; thesis: string | null }

export const PILLAR_THESES: Record<string, string> = {
  'belonging-and-the-forum':
    `Why founders stay: the Forum, the rituals and the people that make ${CHAPTER_NAME} worth protecting, told through what members actually experienced.`,
  'leadership-quality':
    'Better leaders run better companies: takeaways from the Leadership Program, member learning and RISE that a founder can use on Monday.',
  'founder-sustainability':
    'The founder behind the company: family, Spouses and Life Partners, health and balance, and how peers help carry the load.',
  'strategic-alliances':
    `The partners who invest in ${CHAPTER_NAME} members, and what the partnership is worth to both sides.`,
}

export function pillarsFrom(posts: Pick<PostMeta, 'pillar' | 'pillarSlug'>[]): Pillar[] {
  const counts = new Map<string, Pillar>()
  for (const p of posts) {
    if (!p.pillar || !p.pillarSlug) continue
    const hit = counts.get(p.pillarSlug)
    if (hit) hit.count += 1
    else counts.set(p.pillarSlug, { slug: p.pillarSlug, name: p.pillar, count: 1, thesis: PILLAR_THESES[p.pillarSlug] ?? null })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
