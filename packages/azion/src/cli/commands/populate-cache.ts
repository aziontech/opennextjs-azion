/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
import { computeCacheKey, DEFAULT_PREFIX, NAME_FILE_TAG_MANIFEST } from "../../core/overrides/internal.js";
import { tqdm } from "ts-tqdm";

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

function populateStaticAssetsIncrementalCache(options: BuildOptions, cacheDir?: string) {
  logger.info("Populating cache...");
  const storageCacheDir = path.join(cacheDir!, STATIC_ASSETS_CACHE_DIR);
  if (existsSync(storageCacheDir)) {
    rmSync(storageCacheDir, { recursive: true, force: true });
  }

  // Create the cache directory if it doesn't exist
  mkdirSync(storageCacheDir, { recursive: true });

  const assets = getCacheAssets(options);

  logger.info(`Writing ${assets.length} cache files to ${storageCacheDir}`);

  for (const asset of tqdm(assets)) {
    const { fullPath, key, buildId, isFetch } = asset;

    // Compute the cache key (this will be hashed for safe file names)
    const cacheKey = computeCacheKey(key, {
      prefix: DEFAULT_PREFIX,
      buildId,
      cacheType: isFetch ? "fetch" : "cache",
    });

    // Create the full file path in the cache directory
    const cacheFilePath = path.join(storageCacheDir, cacheKey);

    // Ensure the directory exists for nested paths
    const cacheFileDir = path.dirname(cacheFilePath);
    if (!existsSync(cacheFileDir)) {
      mkdirSync(cacheFileDir, { recursive: true });
    }

    // Read the original file content and write it to the cache location
    const fileContent = readFileSync(fullPath, "utf8");
    writeFileSync(cacheFilePath, fileContent, "utf8");
  }

  // Copy tag manifest
  if (existsSync(path.join(options.outputDir, "azion", NAME_FILE_TAG_MANIFEST))) {
    const tagManifestPath = path.join(options.outputDir, "azion", NAME_FILE_TAG_MANIFEST);
    cpSync(tagManifestPath, path.join(storageCacheDir, NAME_FILE_TAG_MANIFEST));
    rmSync(tagManifestPath);
  }

  logger.info(`Successfully populated cache with ${assets.length} files`);
}

export async function populateCache(
  options: BuildOptions,
  config: OpenNextConfig,
  populateCacheOptions: { cacheDir?: string }
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
