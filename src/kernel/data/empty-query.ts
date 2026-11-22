// Chapter app only (no edge8 counterpart). A stand-in for a PostgREST query over
// an edge8 table the chapter app does not have (client programs, meetings, staff
// assignments): every filter, order and limit chains, and awaiting it answers
// no rows, as the real query would over an empty table. Lets edge8 code that
// reads those tables run unchanged.
//
// The type is the untyped PostgREST builder, what edge8's own door helpers
// return (`select<string, Record<string, unknown>>`), so callers type-check
// exactly as they do upstream.
import { supabaseUntyped } from "@/kernel/data/supabase";

type Row = Record<string, unknown>;
const typedShape = () => supabaseUntyped.from("_").select<string, Row>("*");
export type EmptySelect = ReturnType<typeof typedShape>;

export function emptySelect(): EmptySelect {
  let single = false;
  const settle = () => ({ data: single ? null : [], error: null, count: 0, status: 200, statusText: "OK" });
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
            Promise.resolve(settle()).then(resolve, reject);
        }
        if (prop === "single" || prop === "maybeSingle") {
          return () => {
            single = true;
            return proxy;
          };
        }
        return () => proxy;
      },
    },
  );
  return proxy as EmptySelect;
}
