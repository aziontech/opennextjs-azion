/* eslint-disable @typescript-eslint/no-explicit-any */
import { debugCache } from "../../core/overrides/internal.js";

class CacheApi {
  private static hostname: string = "cacheapinextjs";
  static async getCacheAPI(cacheStorageName: string, key: string): Promise<string | null> {
    try {
      debugCache("CacheApi - Get for key:", key, cacheStorageName);
      // @ts-ignore
      const cache = await caches.open(cacheStorageName);
      const url = new URL(key, `http://${this.hostname}`);
      const request = new Request(url);
      const result = await cache.match(request);
      if (result?.text) {
        const res = await result.text();
        return res;
      }
      return null;
    } catch (e) {
      debugCache("Get CacheApi error:", (e as any).message);
      throw new Error("CacheApi not available or problem with getting cache API");
    }
  }
  static async putCacheAPIkey(cacheStorageName: string, key: string, content: string): Promise<void> {
    try {
      // @ts-ignore
      const cache = await caches.open(cacheStorageName);
      const url = new URL(key, `http://${this.hostname}`);
      const request = new Request(url);
      const response = new Response(content);
      await cache.put(request, response);
      debugCache("CacheApi - PUT for key:", key);
    } catch (e) {
      debugCache("Put CacheApi error:", (e as any).message);
      throw new Error("CacheApi not available or problem with putting cache API");
    }
  }
  static async deleteCacheAPIkey(cacheStorageName: string, key: string): Promise<any> {
    try {
      // @ts-ignore
      const cache = await caches.open(cacheStorageName);
      const url = new URL(key, `http://${this.hostname}`);
      const request = new Request(url);
      return cache.delete(request);
    } catch (e) {
      debugCache("Delete CacheApi error:", e);
      throw new Error("CacheApi not available or problem with deleting cache API");
    }
  }
}

export default CacheApi;
