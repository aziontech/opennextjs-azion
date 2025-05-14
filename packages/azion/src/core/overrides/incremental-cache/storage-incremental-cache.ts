import { error } from "@opennextjs/aws/adapters/logger.js";
import type {
  CacheEntryType,
  CacheValue,
  IncrementalCache,
  WithLastModified,
} from "@opennextjs/aws/types/overrides.js";
import { IgnorableError, RecoverableError } from "@opennextjs/aws/utils/error.js";

import { debugCache, FALLBACK_BUILD_ID } from "../internal.js";
import { getAzionContext } from "../../../api/azion-context.js";

//  Assets inside `data-cache/...` are only accessible by the worker.
export const CACHE_DIR = "data-cache/_next_cache";

export const NAME = "az-storage-incremental-cache";

/**
 * This cache uses Workers storage.
 *
 */
class StorageIncrementalCache implements IncrementalCache {
  readonly name = NAME;

  async get<CacheType extends CacheEntryType = "cache">(
    key: string,
    cacheType?: CacheType
  ): Promise<WithLastModified<CacheValue<CacheType>> | null> {
    debugCache(`Get ${key}`, cacheType);

    try {
      const value = await getAzionContext().env.AZION.Storage.get(this.getAssetUrl(key, cacheType));

      if (!value || !value.content) throw new IgnorableError(`Cache miss for ${key}`);

      const cacheValue = JSON.parse(value.content) as CacheValue<CacheType>;

      return {
        value: cacheValue,
        // __BUILD_TIMESTAMP_MS__ is injected by ESBuild.
        lastModified:
          (cacheValue as any).lastModified ??
          (globalThis as { __BUILD_TIMESTAMP_MS__?: number }).__BUILD_TIMESTAMP_MS__,
      };
    } catch (e) {
      error("Failed to get from cache", e);
      return null;
    }
  }

  async set<CacheType extends CacheEntryType = "cache">(
    key: string,
    value: CacheValue<CacheType>,
    cacheType?: CacheType
  ): Promise<void> {
    try {
      debugCache(`Set ${key}`, cacheType);

      const timestamp = Date.now();
      await getAzionContext().env.AZION.Storage.put(
        this.getAssetUrl(key, cacheType),
        JSON.stringify({
          ...value,
          // __BUILD_TIMESTAMP_MS__ is injected by ESBuild.
          lastModified: timestamp,
        }),
        { metadata: { lastModified: timestamp } }
      );
    } catch (e) {
      throw new RecoverableError(`Failed to set cache [${key}]`);
    }
  }

  async delete(key: string): Promise<void> {
    debugCache(`Delete ${key}`);

    try {
      console.log(`delete ${key}`);
    } catch {
      throw new RecoverableError(`Failed to delete cache [${key}]`);
    }
  }

  protected getAssetUrl(key: string, cacheType?: CacheEntryType): string {
    if (cacheType === "composable") {
      throw new Error("Composable cache is not supported in static assets incremental cache");
    }
    const buildId = process.env.NEXT_BUILD_ID ?? FALLBACK_BUILD_ID;
    const name = (
      cacheType === "fetch"
        ? `${CACHE_DIR}/__fetch/${buildId}/${key}`
        : `${CACHE_DIR}/${buildId}/${key}.cache`
    ).replace(/\/+/g, "/");
    return name;
  }
}

export default new StorageIncrementalCache();
