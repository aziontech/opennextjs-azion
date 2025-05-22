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
import CacheApi from "../../../api/cache-api/index.js";

//  Assets inside `data-cache/...` are only accessible by the worker.
export const CACHE_DIR = "data-cache/_next_cache";

export const NAME = "azion-storage-incremental-cache";

const BUILD_ID = process.env.NEXT_BUILD_ID ?? FALLBACK_BUILD_ID;

/**
 * This cache uses Workers storage.
 *
 */
class StorageIncrementalCache implements IncrementalCache {
  readonly name = NAME;
  private readonly storageCachePrefix = `${BUILD_ID}`;

  async get<CacheType extends CacheEntryType = "cache">(
    key: string,
    cacheType?: CacheType
  ): Promise<WithLastModified<CacheValue<CacheType>> | null> {
    debugCache(`Get ${key}`, cacheType);
    try {
      const azionContext = getAzionContext();
      const responseCacheAPI = await CacheApi.getCacheAPI(
        `${this.storageCachePrefix}_${azionContext.env.AZION.CACHE_API_STORAGE_NAME}`,
        key
      ).catch((e) => {
        debugCache("Error CacheApi", e.message);
        return null;
      });

      if (responseCacheAPI) {
        debugCache("Response Cache API by key:", key);
        const cacheApiContentParsed = JSON.parse(responseCacheAPI);
        return {
          value: cacheApiContentParsed,
          lastModified: cacheApiContentParsed.lastModified
            ? Number(cacheApiContentParsed.lastModified)
            : (globalThis as { __BUILD_TIMESTAMP_MS__?: number }).__BUILD_TIMESTAMP_MS__,
        };
      }

      // Storage API
      const keyURL = this.getCacheURL(key, cacheType, azionContext.env.AZION.BUCKET_PREFIX);
      // bind the env to the worker
      const cacheValue = await azionContext.env.AZION.Storage.get(keyURL);
      if (!cacheValue) throw new IgnorableError(`Cache miss for ${key}`);

      const cacheContentArray = await cacheValue.arrayBuffer();
      const decoder = new TextDecoder();
      const cacheContent = JSON.parse(decoder.decode(cacheContentArray));

      debugCache("Cache by Storage API:", key);
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
      const azionContext = getAzionContext();

      const newCacheValue = JSON.stringify({
        ...value,
        lastModified: Date.now(),
      });

      // Cache API
      await CacheApi.putCacheAPIkey(
        `${this.storageCachePrefix}_${azionContext.env.AZION.CACHE_API_STORAGE_NAME}`,
        key,
        newCacheValue
      ).catch((e) => {
        debugCache("Error CacheApi on PUT", e.message);
        return null;
      });

      // Storage API
      const encoder = new TextEncoder();
      const newCacheValueBuffer = encoder.encode(newCacheValue);
      const keyURL = this.getCacheURL(key, cacheType, azionContext.env.AZION.BUCKET_PREFIX);
      await azionContext.env.AZION.Storage.put(keyURL, newCacheValueBuffer, {
        metadata: { id: `${BUILD_ID}` },
      });

      debugCache("Put Storage API:", key);
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
