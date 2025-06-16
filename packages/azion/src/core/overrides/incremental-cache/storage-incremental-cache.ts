/**
 * This code was originally copied and modified from the @opennextjs/aws repository.
 * Significant changes have been made to adapt it for use with Azion.
 */

import type {
  CacheEntryType,
  CacheValue,
  IncrementalCache,
  WithLastModified,
} from "@opennextjs/aws/types/overrides.js";
import { IgnorableError, RecoverableError } from "@opennextjs/aws/utils/error.js";

import { getAzionContext } from "../../../api/azion-context.js";
import CacheApi from "../../../api/cache-api/index.js";
import { debugCache, FALLBACK_BUILD_ID } from "../internal.js";

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
    debugCache(`StorageIncrementalCache - Get ${key}`, cacheType);
    try {
      const cacheContent = await this.getCacheApiOrStorage(key, cacheType ?? "cache");
      if (!cacheContent) {
        debugCache(`StorageIncrementalCache - MISS for key: ${key}`);
        return null;
      }
      const cacheValueParsed = JSON.parse(cacheContent);
      return {
        value: cacheValueParsed,
        // __BUILD_TIMESTAMP_MS__ is injected by ESBuild.
        lastModified: cacheValueParsed.lastModified
          ? Number(cacheValueParsed.lastModified)
          : (globalThis as { __BUILD_TIMESTAMP_MS__?: number }).__BUILD_TIMESTAMP_MS__,
      };
    } catch (e) {
      debugCache("Failed to get from cache", (e as Error)?.message);
      return null;
    }
  }

  async set<CacheType extends CacheEntryType = "cache">(
    key: string,
    value: CacheValue<CacheType>,
    cacheType?: CacheType
  ): Promise<void> {
    try {
      debugCache(`StorageIncrementalCache - Set ${key}`, cacheType);
      await this.setCacheApiOrStorage(key, value, cacheType ?? "cache");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      throw new RecoverableError(`Failed to set cache [${key}]`);
    }
  }

  async delete(key: string): Promise<void> {
    debugCache(`StorageIncrementalCache - Delete ${key}`);
    try {
      debugCache(`StorageIncrementalCache - Deleting cache for key: ${key}`);
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

  protected async getCacheApiOrStorage(key: string, cacheType: CacheEntryType): Promise<string> {
    const azionContext = getAzionContext();
    const resCacheAPI = await CacheApi.getCacheAPI(
      `${this.storageCachePrefix}_${azionContext.env.AZION?.CACHE_API_STORAGE_NAME}`,
      key
    ).catch((e) => {
      debugCache(e.message);
      return null;
    });
    if (resCacheAPI) {
      debugCache("StorageIncrementalCache - HIT by CACHE_API for key:", key);
      return resCacheAPI;
    }
    debugCache("StorageIncrementalCache - MISS by CACHE_API for key:", key, "falling back to storage");
    const keyURL = this.getCacheURL(key, cacheType, azionContext.env.AZION?.BUCKET_PREFIX);
    const fileValue = await azionContext.env.AZION?.Storage.get(keyURL).catch(() => {
      debugCache(`StorageIncrementalCache - Cache file not exist on storage`);
      return null;
    });
    if (!fileValue) throw new IgnorableError(`StorageIncrementalCache - Cache file not found at ${key}`);
    const fileValueArray = await fileValue.arrayBuffer();
    const decoder = new TextDecoder();
    const cacheContent = decoder.decode(fileValueArray);
    debugCache("StorageIncrementalCache - HIT by Storage for key:", key);
    // set cache API because ssg pages are not stored in first run
    if (!resCacheAPI) {
      debugCache("StorageIncrementalCache - Setting CACHE_API FIRST TIME:", key);
      this.setCacheApiOrStorage(key, JSON.parse(cacheContent), cacheType, true).catch((e) => {
        debugCache("Failed to set cache API:", e.message);
      });
    }
    return cacheContent;
  }

  protected async setCacheApiOrStorage(
    key: string,
    value: CacheValue<CacheEntryType>,
    cacheType: CacheEntryType,
    onlyCacheApi = false
  ): Promise<void> {
    const azionContext = getAzionContext();
    const newCacheValue = JSON.stringify({
      ...value,
      lastModified: Date.now(),
    });

    // Cache API
    await CacheApi.putCacheAPIkey(
      `${this.storageCachePrefix}_${azionContext.env.AZION?.CACHE_API_STORAGE_NAME}`,
      key,
      newCacheValue
    ).catch((e) => {
      debugCache(e.message);
      return null;
    });

    // Storage API
    if (onlyCacheApi) {
      return;
    }
    const encoder = new TextEncoder();
    const newCacheValueBuffer = encoder.encode(newCacheValue);
    const keyURL = this.getCacheURL(key, cacheType, azionContext.env.AZION?.BUCKET_PREFIX);
    await azionContext.env.AZION?.Storage.put(keyURL, newCacheValueBuffer, {
      metadata: { id: `${BUILD_ID}` },
    });
    debugCache("StorageIncrementalCache - written to storage for key:", key);
  }
}

export default new StorageIncrementalCache();
