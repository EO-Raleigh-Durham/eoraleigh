import type { ReactNode } from "react";
import { Edge8Frame } from "@/app/board/edge8/Edge8Frame";

// The Workboards (edge8-web's entities/boards), mounted under /board.
export default function WorkboardsLayout({ children }: { children: ReactNode }) {
  return <Edge8Frame>{children}</Edge8Frame>;
}
