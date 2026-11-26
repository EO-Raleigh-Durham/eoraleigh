// RISE recaps cross-linked by src/components/blog/RiseRecapLinks.tsx. Add one
// row per recap post if your chapter runs a recap series; empty by default.

export type RiseRecap = {
  slug: string;
  label: string;
  title: string;
  meta: string;
  image: string;
};

export const RISE_RECAPS: RiseRecap[] = [];
