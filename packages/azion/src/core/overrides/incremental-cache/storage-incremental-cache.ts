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

export const NAME = "azion-storage-incremental-cache";

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
      const azionContext = getAzionContext().env;
      const keyURL = this.getCacheURL(key, cacheType, azionContext.AZION.BUCKET_PREFIX);
      const cacheValue = await azionContext.AZION.Storage.get(keyURL);
      if (!cacheValue) throw new IgnorableError(`Cache miss for ${key}`);

      const cacheContentArray = await cacheValue.arrayBuffer();

      const decoder = new TextDecoder();
      const cacheContent = JSON.parse(decoder.decode(cacheContentArray));

      return {
        value: cacheContent,
        // __BUILD_TIMESTAMP_MS__ is injected by ESBuild.
        lastModified: cacheContent.lastModified
          ? Number(cacheContent.lastModified)
          : (globalThis as { __BUILD_TIMESTAMP_MS__?: number }).__BUILD_TIMESTAMP_MS__,
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
      const azionContext = getAzionContext().env;

      const timestamp = Date.now();

      const newCacheValue = JSON.stringify({
        ...value,
        // __BUILD_TIMESTAMP_MS__ is injected by ESBuild.
        lastModified: timestamp,
      });

      const encoder = new TextEncoder();
      const newCacheValueBuffer = encoder.encode(newCacheValue);

      const keyURL = this.getCacheURL(key, cacheType, azionContext.AZION.BUCKET_PREFIX);
      await azionContext.AZION.Storage.put(keyURL, newCacheValueBuffer, {
        metadata: { id: `${timestamp}` },
      });
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

  protected getCacheURL(key: string, cacheType?: CacheEntryType, bucketPrefix?: string): string {
    if (cacheType === "composable") {
      throw new Error("Composable cache is not supported in static assets incremental cache");
    }
    const buildId = process.env.NEXT_BUILD_ID ?? FALLBACK_BUILD_ID;
    const name = (
      cacheType === "fetch"
        ? `${bucketPrefix}/${CACHE_DIR}/__fetch/${buildId}/${key}`
        : `${bucketPrefix}/${CACHE_DIR}/${buildId}/${key}.cache`
    ).replace(/\/+/g, "/");
    return name;
  }
}

export default new StorageIncrementalCache();
