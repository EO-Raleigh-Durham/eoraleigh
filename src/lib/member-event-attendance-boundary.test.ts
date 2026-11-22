import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const libDir = path.resolve("src/lib");

test("normalized attendance stays within board and internal engagement loaders", async () => {
  const sourceFiles = (await readdir(path.resolve("src"), { recursive: true }))
    .filter((name) => typeof name === "string" && /\.(?:ts|tsx)$/.test(name))
    .filter((name) => !name.endsWith(".test.ts")) as string[];
  const sourceByPath = new Map<string, string>();

  for (const relative of sourceFiles) {
    const absolute = path.resolve("src", relative);
    sourceByPath.set(relative, await readFile(absolute, "utf8"));
  }

  const importersOf = (moduleName: string) => sourceFiles
    .filter((relative) => sourceByPath.get(relative)?.includes(moduleName))
    .sort();

  assert.deepEqual(importersOf("member-event-attendance"), [
    "lib/engagement.ts",
    "lib/member-activity.ts",
  ]);
  assert.deepEqual(importersOf("@/lib/member-activity"), [
    "app/board/members/MemberActivity.tsx",
    "app/board/members/actions.ts",
  ]);
  assert.deepEqual(importersOf("@/lib/engagement"), [
    "app/board/events/performance/page.tsx",
    "app/board/members/[id]/page.tsx",
    "app/board/the-pulse-of-the-chapter/PulseMatrix.tsx",
    "app/board/the-pulse-of-the-chapter/page.tsx",
    "lib/goal-metrics.ts",
    "lib/growth-forecast.ts",
  ]);
  assert.deepEqual(importersOf("@/lib/growth-forecast"), [
    "app/board/GrowthForecast.tsx",
    "app/board/the-pulse-of-the-chapter/page.tsx",
  ]);

  const loaderSource = await readFile(path.join(libDir, "member-event-attendance.ts"), "utf8");
  assert.match(loaderSource, /\.from\(["']member_event_attendance["']\)/);
  assert.doesNotMatch(loaderSource, /\.from\(["']global_event_participation["']\)/);
});
