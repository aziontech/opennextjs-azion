import path from "node:path";

import { type BuildOptions, getPackagePath } from "@opennextjs/aws/build/helper.js";

import { normalizePath } from "../../utils/index.js";

/**
 * Sets up the OpenNext cache handler in a Next.js build.
 *
 * The cache handler used by Next.js is normally defined in the config file as a path. At runtime,
 * Next.js would then do a dynamic require on a transformed version of the path to retrieve the
 * cache handler and create a new instance of it.
 *
 * This is problematic in workerd due to the dynamic import of the file that is not known from
 * build-time. Therefore, we have to manually override the default way that the cache handler is
 * instantiated with a dynamic require that uses a string literal for the path.
 */
export async function patchCache(code: string, buildOpts: BuildOptions): Promise<string> {
  const { outputDir } = buildOpts;

  // TODO: switch to cache.mjs
  const outputPath = path.join(outputDir, "server-functions/default");
  const cacheFile = path.join(outputPath, getPackagePath(buildOpts), "cache.cjs");

  const regex13 =
    /CacheHandler\s*=\s*dynamicRequire\(\(0,\s*_path\.isAbsolute\)\(incrementalCacheHandlerPath\)\s*\?\s*incrementalCacheHandlerPath\s*:\s*\(0,\s*_path\.join\)\(this\.distDir,\s*incrementalCacheHandlerPath\)\);/;
  const regex14 = /const { cacheHandler } = this\.nextConfig;/;

  if (regex13.test(code)) {
    return code.replace(regex13, `CacheHandler = require('${normalizePath(cacheFile)}');`);
  }
  return code.replace(
    regex14,
    `
      const cacheHandler = null;
      CacheHandler = require('${normalizePath(cacheFile)}').default;
      `
  );
}
