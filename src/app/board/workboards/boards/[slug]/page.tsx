// Mounts edge8-web's Workboards screen (entities/boards) at its chapter path.
// The body lives in @/entities/boards/routes/admin/(dashboard)/boards/[slug]/page.
export { default, metadata } from "@/entities/boards/routes/admin/(dashboard)/boards/[slug]/page";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
