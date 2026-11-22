// The chapter app's version of edge8-web's entities/site/lib/postData.ts (EO-owned).
// The post metadata shape is edge8's; the categories are the chapter's blog
// categories (public.blog_posts.category).
export interface PostMeta {
  slug: string
  title: string
  date: string
  category: string
  categorySlug: string
  image: string
  readTime: string
  tags: string[]
  mdFile: string
  excerpt: string
  pillar?: string
  pillarSlug?: string
}

export const categories = [
  { slug: 'event-recap', label: 'Event Recap' },
  { slug: 'leadership', label: 'Leadership' },
  { slug: 'member-spotlight', label: 'Member Spotlight' },
  { slug: 'scaling', label: 'Scaling' },
  { slug: 'playbook', label: 'Playbook' },
  { slug: 'ai', label: 'AI' },
]
