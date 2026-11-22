import "server-only";

import { requireMemberOrAbove } from "./auth";
import { getBlogIndexData } from "@/app/blog/blog-index-data";

// Member-area Blog loader: the same index as the public /blog page. The
// member-level check stays here because the blog reads use the service client.
export async function getMemberBlogIndex() {
  await requireMemberOrAbove();
  return getBlogIndexData();
}
