import type { BuildOptions } from "@opennextjs/aws/build/helper.js";
import type { PluginBuild } from "esbuild";
import { describe, expect, test } from "vitest";

import { shimRequireHook } from "./require-hook.js";

describe("shimRequireHook", () => {
  const filters: RegExp[] = [];
  shimRequireHook({ outputDir: "/out" } as BuildOptions).setup({
    onResolve: ({ filter }: { filter: RegExp }) => filters.push(filter),
  } as unknown as PluginBuild);
  const isShimmed = (path: string) => filters.some((filter) => filter.test(path));

  test.each([
    "./require-hook",
    "./node-environment",
    // Next 16.2+ (`next/dist/build/adapter/setup-node-env.external.js`)
    "next/dist/server/require-hook",
    "next/dist/server/require-hook.js",
    "next/dist/server/node-environment",
    "next/dist/server/node-environment.js",
  ])("shims %s", (path) => {
    expect(isShimmed(path)).toBe(true);
  });

  test.each([
    "./require-hook-extra",
    "next/dist/server/require",
    "next/dist/server/node-environment-baseline",
  ])("does not shim %s", (path) => {
    expect(isShimmed(path)).toBe(false);
  });
});
