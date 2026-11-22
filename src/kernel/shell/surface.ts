// The chapter app's version of edge8-web's kernel/shell/surface.ts (EO-owned).
// One staff surface, /board (see surface-shared.ts). Same names and async
// signatures as edge8's, so code copied from edge8-web ports unchanged.
import { revalidatePath } from "next/cache";
import type { Surface } from "./surface-shared";

export async function currentSurface(): Promise<Surface> {
  return "admin";
}

/** "/board", to prefix a path given after the surface: `${await surfaceBase()}/marketing`. */
export async function surfaceBase(): Promise<"/board"> {
  return "/board";
}

/** Refresh a page after a write. `path` starts after the surface, for instance "/marketing". */
export function revalidateSurfaces(path: string, type?: "page" | "layout"): void {
  revalidatePath(`/board${path}`, type);
}
