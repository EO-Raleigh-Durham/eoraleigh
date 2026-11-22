// Mounts edge8-web's My Week (entities/boards, team surface) at /board/workboards/my-week.
// Edge8 fills the inbox line from its notifications entity; this chapter has none,
// so the slot is empty.
import type { ComponentProps } from "react";
import Body from "@/entities/boards/routes/team/(dashboard)/my-week/page";
export { metadata } from "@/entities/boards/routes/team/(dashboard)/my-week/page";

export default function Page(props: Omit<ComponentProps<typeof Body>, "inboxLine">) {
  return <Body {...props} inboxLine={null} />;
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
