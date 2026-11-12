import { existsSync, renameSync } from "node:fs";
import path from "node:path";

import { loadConfig } from "@opennextjs/aws/adapters/config/util.js";
import type { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { getBuildId } from "@opennextjs/aws/build/helper.js";
import type { TagCacheMetaFile } from "@opennextjs/aws/types/cache.js";

/**
 * Makes every cache asset use the same ID as the runtime caches (`OPEN_NEXT_BUILD_ID`).
 *
 * `@opennextjs/aws` names the cache assets folder after the `deploymentId` when set, but still uses the real
 * build ID for the `__fetch` folder and for the tags of the tag cache. With a `deploymentId` that would
 * seed the storage under two different IDs, while the runtime only reads and writes under one of them.
 *
 * @param options Build options.
 * @param metaFiles Tag cache meta files returned by `createCacheAssets` (updated in place).
 * @returns The ID used by the cache assets.
 */
export function alignCacheAssetsBuildId(options: BuildOptions, metaFiles: TagCacheMetaFile[]): string {
  const buildId = getBuildId(options);
  const { deploymentId } = loadConfig(path.join(options.appBuildOutputPath, ".next"));
  const cacheBuildId = deploymentId ?? buildId;

  if (cacheBuildId === buildId) return cacheBuildId;

  const fetchDir = path.join(options.outputDir, "cache", "__fetch");
  if (existsSync(path.join(fetchDir, buildId))) {
    renameSync(path.join(fetchDir, buildId), path.join(fetchDir, cacheBuildId));
  }

  for (const metaFile of metaFiles) {
    metaFile.tag.S = replaceBuildIdPrefix(metaFile.tag.S, buildId, cacheBuildId);
    metaFile.path.S = replaceBuildIdPrefix(metaFile.path.S, buildId, cacheBuildId);
  }

  return cacheBuildId;
}

function replaceBuildIdPrefix(value: string, from: string, to: string) {
  return value.startsWith(`${from}/`) ? `${to}${value.slice(from.length)}` : value;
}
