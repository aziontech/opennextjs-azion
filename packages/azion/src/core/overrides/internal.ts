/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { CacheEntryType,CacheValue } from "@opennextjs/aws/types/overrides.js";

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
