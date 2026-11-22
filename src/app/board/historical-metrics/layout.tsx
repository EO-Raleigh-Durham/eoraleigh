import type { ReactNode } from "react";
import { Edge8Frame } from "@/app/board/edge8/Edge8Frame";
import "@/app/board/edge8/talent-ats.css";
import "@/app/board/edge8/company-section.css";
import "@/app/board/edge8/eo-chapter.css";

// A screen ported from edge8-web, drawn with edge8's stylesheet inside EO's /board shell,
// in edge8's Company section design (talent-ats.css) plus EO's chapter rules.
export default function Layout({ children }: { children: ReactNode }) {
  return <Edge8Frame>{children}</Edge8Frame>;
}
