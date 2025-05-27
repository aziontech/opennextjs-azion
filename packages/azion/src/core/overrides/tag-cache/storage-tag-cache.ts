/**
 * This code was originally copied and modified from the @opennextjs/aws repository.
 * Significant changes have been made to adapt it for use with Azion.
 */

import type { TagCache } from "@opennextjs/aws/types/overrides";
import { getAzionContext } from "../../../api";
import { IgnorableError } from "@opennextjs/aws/utils/error.js";
import { debugCache, FALLBACK_BUILD_ID } from "../internal.js";
import CacheApi from "../../../api/cache-api";

const CACHE_DIR = "data-cache/_next_cache";
const CACHE_TAGS_MANIFEST = `cache-tags-manifest.cache`;
const BUILD_ID = process.env.NEXT_BUILD_ID ?? FALLBACK_BUILD_ID;

type TagsManifest = {
  items: { tag: string; path: string }[];
  revalidations?: { tag: string; path: string; revalidatedAt?: number }[];
};

const getTagManifestStorage = async (filePath: string): Promise<string> => {
  const azionContext = getAzionContext();
  const storagePath = `${azionContext.env.AZION?.BUCKET_PREFIX}/${CACHE_DIR}/${filePath}`;
  const fileValue = await azionContext.env.AZION?.Storage.get(storagePath);
  if (!fileValue) throw new IgnorableError(`StorageTagCache - Tag file not found at ${filePath}`);
  const fileValueArray = await fileValue.arrayBuffer();
  const decoder = new TextDecoder();
  const manifestContent = decoder.decode(fileValueArray);
  debugCache("StorageTagCache - Tags manifest HIT from storage");
  // set the manifest content to be cache api because the first time is not setted
  await CacheApi.putCacheAPIkey(
    `${BUILD_ID}_${azionContext.env.AZION?.CACHE_API_STORAGE_NAME}`,
    CACHE_TAGS_MANIFEST,
    manifestContent
  ).catch((e) => {
    debugCache(e.message);
    return null;
  });
  debugCache("StorageTagCache - Tags manifest written to cache API");
  return manifestContent;
};

const getManifestCacheApiOrStorage = async (): Promise<string> => {
  const azionContext = getAzionContext();
  const cacheApiManifest = await CacheApi.getCacheAPI(
    `${BUILD_ID}_${azionContext.env.AZION?.CACHE_API_STORAGE_NAME}`,
    CACHE_TAGS_MANIFEST
  ).catch((e) => {
    debugCache(e.message);
    return null;
  });
  if (cacheApiManifest) {
    debugCache("StorageTagCache - Cache API HIT for tags manifest");
    return cacheApiManifest;
  }
  debugCache("StorageTagCache - MISS for tags manifest, falling back to storage");
  return await getTagManifestStorage(CACHE_TAGS_MANIFEST);
};

const setManifestCacheApiOrStorage = async (manifest: TagsManifest): Promise<void> => {
  const azionContext = getAzionContext();
  const manifestString = JSON.stringify(manifest);
  // Cache API PUT
  await CacheApi.putCacheAPIkey(
    `${BUILD_ID}_${azionContext.env.AZION?.CACHE_API_STORAGE_NAME}`,
    CACHE_TAGS_MANIFEST,
    manifestString
  ).catch((e) => {
    debugCache(e.message);
    return null;
  });
  // Storage PUT
  const encoder = new TextEncoder();
  const tagsBuffer = encoder.encode(manifestString);
  const storagePath = `${azionContext.env.AZION?.BUCKET_PREFIX}/${CACHE_DIR}/${CACHE_TAGS_MANIFEST}`;
  await azionContext.env.AZION?.Storage.put(storagePath, tagsBuffer, {
    metadata: { id: `${BUILD_ID}` },
  });
  debugCache("StorageTagCache - Tags manifest written to storage");
};

const getCacheKey = (key: string) => {
  return `${BUILD_ID}/${key}`.replaceAll("//", "/");
};

// This cache implementation uses Azion's Storage and Cache API to manage tags for paths.
const storageTagCache: TagCache = {
  name: "storage-tag-cache",
  mode: "original",
  getByPath: async (path: string) => {
    debugCache("StorageTagCache - getByPath", path);
    const tagsManifest = await getManifestCacheApiOrStorage();
    const tagsParsed = JSON.parse(tagsManifest) as TagsManifest;
    const tags = tagsParsed?.items.filter((item) => item.path === getCacheKey(path));
    if (!tags || tags?.length === 0) {
      debugCache("StorageTagCache - No tags found for path:", path);
      return [];
    }
    const tagsForPath = tags.map((item) => item.tag.replace(`${BUILD_ID}/`, ""));
    return tagsForPath;
  },
  getByTag: async (tag: string) => {
    debugCache("StorageTagCache - getByTag", tag);
    const tagsManifest = await getManifestCacheApiOrStorage();
    const tagsParsed = JSON.parse(tagsManifest) as TagsManifest;
    const tags = tagsParsed?.items.filter((item) => item.tag === getCacheKey(tag));
    if (!tags || tags?.length === 0) {
      debugCache("StorageTagCache - No tags found for tag:", tag);
      return [];
    }
    const pathsForTag = tags.map((item) => item.path.replace(`${BUILD_ID}/`, ""));
    return pathsForTag;
  },
  getLastModified: async (key: string, lastModified: number) => {
    debugCache("StorageTagCache - getLastModified", key, lastModified);
    const tagsManifest = await getManifestCacheApiOrStorage();
    const tagsParsed = JSON.parse(tagsManifest) as TagsManifest;
    const match = tagsParsed.revalidations?.find((reval) => {
      const tag = tagsParsed.items.find((t) => t.tag === reval.tag && t.path === getCacheKey(key));
      return tag && typeof reval.revalidatedAt === "number" && reval.revalidatedAt > (lastModified ?? 0);
    });

    if (match) {
      debugCache("StorageTagCache - Force revalidation for key:", key);
      return -1;
    }
    debugCache("StorageTagCache - No force revalidation for key:", key);
    return lastModified ?? Date.now();
  },
  writeTags: async (tags: { tag: string; path: string; revalidatedAt?: number }[]) => {
    debugCache("StorageTagCache - writeTags", JSON.stringify(tags));
    const uniqueTags = new Set<string>();
    const tagsManifest = await getManifestCacheApiOrStorage();
    const tagsManifestParsed = JSON.parse(tagsManifest) as TagsManifest;
    const results = tags
      .map(({ tag, path, revalidatedAt }) => {
        const tagPath = getCacheKey(tag);
        const tagsPath = getCacheKey(path);
        if (!uniqueTags.has(tag) && revalidatedAt !== -1) {
          uniqueTags.add(tag);
          return {
            tag: tagPath,
            path: tagsPath,
            revalidatedAt: revalidatedAt ?? Date.now(),
          };
        }
        return null;
      })
      .filter((st) => !!st);

    if (results.length >= 0) {
      // Updates only the items from results in tagsManifestParsed.revalidations
      tagsManifestParsed.revalidations = tagsManifestParsed.revalidations || [];
      const revalidationsMap = new Map(
        tagsManifestParsed.revalidations.map((r) => [`${r.tag}|${r.path}`, r])
      );
      results.forEach((item) => {
        if (!item) return;
        revalidationsMap.set(`${item.tag}|${item.path}`, {
          tag: item.tag,
          path: item.path,
          revalidatedAt: item.revalidatedAt,
        });
      });
      tagsManifestParsed.revalidations = Array.from(revalidationsMap.values()).map(
        ({ tag, path, revalidatedAt }) => ({
          tag,
          path,
          ...(typeof revalidatedAt === "number" ? { revalidatedAt } : {}),
        })
      );

      return await setManifestCacheApiOrStorage(tagsManifestParsed);
    }
    return;
  },
};

export default storageTagCache;
