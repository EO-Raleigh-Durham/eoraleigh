import type { ReactNode } from "react";
import { Edge8Frame } from "@/app/board/edge8/Edge8Frame";

// The Marketing System (edge8-web's entities/campaigns), mounted under /board.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <Edge8Frame>{children}</Edge8Frame>;
}
