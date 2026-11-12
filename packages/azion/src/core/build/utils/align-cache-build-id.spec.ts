import { existsSync } from "node:fs";

import type { BuildOptions } from "@opennextjs/aws/build/helper.js";
import type { TagCacheMetaFile } from "@opennextjs/aws/types/cache.js";
import mockFs from "mock-fs";
import { afterEach, describe, expect, test } from "vitest";

import { alignCacheAssetsBuildId } from "./align-cache-build-id.js";

const options = { appBuildOutputPath: "app", outputDir: "app/.open-next" } as BuildOptions;

const metaFile = (tag: string, path: string) =>
  ({ tag: { S: tag }, path: { S: path }, revalidatedAt: { N: "1" } }) as TagCacheMetaFile;

function mockBuild(deploymentId?: string) {
  mockFs({
    "app/.next/BUILD_ID": "real-build-id\n",
    "app/.next/required-server-files.json": JSON.stringify({ config: { deploymentId } }),
    "app/.open-next/cache/__fetch/real-build-id/key": "fetch",
    [`app/.open-next/cache/${deploymentId ?? "real-build-id"}/index.cache`]: "page",
  });
}

describe("alignCacheAssetsBuildId", () => {
  afterEach(() => mockFs.restore());

  test("moves the fetch cache and the tags under the deploymentId", () => {
    mockBuild("v2");
    const metaFiles = [
      metaFile("real-build-id/isr", "real-build-id/hash"),
      metaFile("other/isr", "other/hash"),
    ];

    expect(alignCacheAssetsBuildId(options, metaFiles)).toBe("v2");

    expect(existsSync("app/.open-next/cache/__fetch/v2/key")).toBe(true);
    expect(existsSync("app/.open-next/cache/__fetch/real-build-id")).toBe(false);
    expect(metaFiles.map((m) => [m.tag.S, m.path.S])).toEqual([
      ["v2/isr", "v2/hash"],
      // Not prefixed by the build ID: untouched
      ["other/isr", "other/hash"],
    ]);
  });

  test("does nothing without a deploymentId", () => {
    mockBuild();
    const metaFiles = [metaFile("real-build-id/isr", "real-build-id/hash")];

    expect(alignCacheAssetsBuildId(options, metaFiles)).toBe("real-build-id");

    expect(existsSync("app/.open-next/cache/__fetch/real-build-id/key")).toBe(true);
    expect(metaFiles[0]!.tag.S).toBe("real-build-id/isr");
  });

  test("does not touch a tag that only starts with the same characters as the build ID", () => {
    mockBuild("v2");
    const metaFiles = [metaFile("real-build-id-other/isr", "real-build-id-other/hash")];

    alignCacheAssetsBuildId(options, metaFiles);

    expect(metaFiles[0]!.tag.S).toBe("real-build-id-other/isr");
  });
});
