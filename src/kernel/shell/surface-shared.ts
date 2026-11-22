// The chapter app's version of edge8-web's kernel/shell/surface-shared.ts (EO-owned).
// Edge8 serves its screens on two surfaces, /admin and /team. The chapter app has one
// staff surface, /board, where both edge8 surfaces' screens are mounted
// (scripts/edge8-sync/transform.mjs rewrites edge8's paths to match). The
// Surface names stay so edge8's code compiles; every base is /board.
//
// Dependency-free so the proxy, server components and client components can all import it.

export type Surface = "admin" | "team";

export const SURFACE_HEADER = "x-e8-surface";

export function surfaceOf(_pathname: string): Surface {
  return "admin";
}

export function baseOf(_surface: Surface): "/board" {
  return "/board";
}
