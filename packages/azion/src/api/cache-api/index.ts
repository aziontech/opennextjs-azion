import { debugCache } from "../../core/overrides/internal.js";

class CacheApi {
  private static hostname: string = "cacheapinextjs";
  static async getCacheAPI(cacheStorageName: string, key: string): Promise<string | null> {
    try {
      // @ts-ignore
      const cache = await caches.open(cacheStorageName);
      const url = new URL(key, `http://${this.hostname}`);
      const request = new Request(url);
      const result = cache.match(request);
      if (result.text) {
        return result.text();
      }
      debugCache("Cache API MISS for key:", key);
      return null;
    } catch (e) {
      throw new Error("Problem with getting cache API");
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
      debugCache("Cache API PUT for key:", key);
    } catch (e) {
      throw new Error("Problem with putting cache API");
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
      throw new Error("Problem with deleting cache API");
    }
  }
}

export default CacheApi;
