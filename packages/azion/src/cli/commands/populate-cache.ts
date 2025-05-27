/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

import type { BuildOptions } from "@opennextjs/aws/build/helper.js";
import logger from "@opennextjs/aws/logger.js";
import type {
  IncludedIncrementalCache,
  IncludedTagCache,
  LazyLoadedOverride,
  OpenNextConfig,
} from "@opennextjs/aws/types/open-next.js";
import type { IncrementalCache, TagCache } from "@opennextjs/aws/types/overrides.js";
import { globSync } from "glob";
import {
  CACHE_DIR as STATIC_ASSETS_CACHE_DIR,
  NAME as STATIC_ASSETS_CACHE_NAME,
} from "../../core/overrides/incremental-cache/storage-incremental-cache.js";

async function resolveCacheName(
  value:
    | IncludedIncrementalCache
    | IncludedTagCache
    | LazyLoadedOverride<IncrementalCache>
    | LazyLoadedOverride<TagCache>
) {
  return typeof value === "function" ? (await value()).name : value;
}

export type CacheAsset = { isFetch: boolean; fullPath: string; key: string; buildId: string };

export function getCacheAssets(opts: BuildOptions): CacheAsset[] {
  const allFiles = globSync(path.join(opts.outputDir, "cache/**/*"), {
    withFileTypes: true,
    windowsPathsNoEscape: true,
  }).filter((f) => f.isFile());

  const assets: CacheAsset[] = [];

  for (const file of allFiles) {
    const fullPath = file.fullpathPosix();
    const relativePath = path.relative(path.join(opts.outputDir, "cache"), fullPath);

    if (relativePath.startsWith("__fetch")) {
      const [__fetch, buildId, ...keyParts] = relativePath.split("/");

      if (__fetch !== "__fetch" || buildId === undefined || keyParts.length === 0) {
        throw new Error(`Invalid path for a Cache Asset file: ${relativePath}`);
      }

      assets.push({
        isFetch: true,
        fullPath,
        key: `/${keyParts.join("/")}`,
        buildId,
      });
    } else {
      const [buildId, ...keyParts] = relativePath.slice(0, -".cache".length).split("/");

      if (!relativePath.endsWith(".cache") || buildId === undefined || keyParts.length === 0) {
        throw new Error(`Invalid path for a Cache Asset file: ${relativePath}`);
      }

      assets.push({
        isFetch: false,
        fullPath,
        key: `/${keyParts.join("/")}`,
        buildId,
      });
    }
  }

  return assets;
}

function populateStaticAssetsIncrementalCache(options: BuildOptions, cacheDir: string) {
  logger.info("\nPopulating cache...");
  const storageCacheDir = path.join(cacheDir, STATIC_ASSETS_CACHE_DIR);
  if (existsSync(storageCacheDir)) {
    rmSync(storageCacheDir, { recursive: true, force: true });
  }
  cpSync(path.join(options.outputDir, "cache"), path.join(cacheDir, STATIC_ASSETS_CACHE_DIR), {
    recursive: true,
  });
  logger.info(`Successfully populated cache`);
}

export async function populateCache(
  options: BuildOptions,
  config: OpenNextConfig,
  populateCacheOptions: { cacheDir: string }
) {
  const { incrementalCache } = config.default.override ?? {};

  if (!existsSync(options.outputDir)) {
    logger.error("Unable to populate cache: Open Next build not found");
    process.exit(1);
  }

  if (!config.dangerous?.disableIncrementalCache && incrementalCache) {
    const name = await resolveCacheName(incrementalCache);
    switch (name) {
      case STATIC_ASSETS_CACHE_NAME:
        populateStaticAssetsIncrementalCache(options, populateCacheOptions.cacheDir);
        break;
      default:
        logger.info("Incremental cache does not need populating");
    }
  }
}
