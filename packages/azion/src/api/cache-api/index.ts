class CacheApi {
  private static hostname: string = "cacheapinextjs";
  static async getCacheAPI(cacheStorageName: string, key: string): Promise<any> {
    try {
      // @ts-ignore
      const cache = await caches.open(cacheStorageName);
      const url = `http://${this.hostname}${key}`;
      const request = new Request(url);
      return cache.match(request);
    } catch (e) {
      throw new Error("Problem with getting cache API");
    }
  }
  static async putCacheAPIkey(cacheStorageName: string, key: string, content: string): Promise<string> {
    try {
      // @ts-ignore
      const cache = await caches.open(cacheStorageName);
      const url = `http://${this.hostname}${key}`;
      const request = new Request(url);
      const response = new Response(content);
      await cache.put(request, response);
      return key;
    } catch (e) {
      throw new Error("Problem with putting cache API");
    }
  }
  static async deleteCacheAPIkey(cacheStorageName: string, key: string): Promise<any> {
    try {
      // @ts-ignore
      const cache = await caches.open(cacheStorageName);
      const url = `https://${this.hostname}${key}`;
      const request = new Request(url);
      return cache.delete(request);
    } catch (e) {
      throw new Error("Problem with deleting cache API");
    }
  }
}

export default CacheApi;
