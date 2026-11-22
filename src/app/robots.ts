import type { MetadataRoute } from "next";
import { CHAPTER_SITE_URL } from "@/kernel/config/chapter";

const SITE_URL = CHAPTER_SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/board/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
