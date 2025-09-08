/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { createHash } from "node:crypto";

import { CacheEntryType, CacheValue } from "@opennextjs/aws/types/overrides.js";

export type IncrementalCacheEntry<CacheType extends CacheEntryType> = {
  value: CacheValue<CacheType>;
  lastModified: number;
};
export const debugCache = (name: string, ...args: unknown[]) => {
  if (process.env.NEXT_PRIVATE_DEBUG_CACHE) {
    console.log(`[${name}] `, ...args);
  }
};

export const FALLBACK_BUILD_ID = "no-build-id";

export const DEFAULT_PREFIX = "incremental-cache";
export const NAME_FILE_TAG_MANIFEST = "cache-tags-manifest.cache";

export type KeyOptions = {
  cacheType?: CacheEntryType;
  prefix: string | undefined;
  buildId: string | undefined;
};

export function computeCacheKey(key: string, options: KeyOptions) {
  const { cacheType = "cache", prefix = DEFAULT_PREFIX, buildId = FALLBACK_BUILD_ID } = options;
  const hash = createHash("sha256").update(key).digest("hex");
  return `${prefix}/${buildId}/${hash}.${cacheType}`.replace(/\/+/g, "/");
}
