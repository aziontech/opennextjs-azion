/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { buildNextjsApp, setStandaloneBuildMode } from "@opennextjs/aws/build/buildNextApp.js";
import { compileCache } from "@opennextjs/aws/build/compileCache.js";
import { createCacheAssets, createStaticAssets } from "@opennextjs/aws/build/createAssets.js";
import { createMiddleware } from "@opennextjs/aws/build/createMiddleware.js";
import * as buildHelper from "@opennextjs/aws/build/helper.js";
import { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { printHeader } from "@opennextjs/aws/build/utils.js";
import logger from "@opennextjs/aws/logger.js";
import { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

import { compileTagAssets } from "../../api/compile-tag-assets.js";
import { bundleServer } from "../../core/build/bundle-server.js";
import { compileEnvFiles } from "../../core/build/open-next/compile-env-files.js";
import { compileInit } from "../../core/build/open-next/compile-init.js";
import { createServerBundle } from "../../core/build/open-next/createServerBundle.js";
import { getVersion } from "../../core/build/utils/version.js";
import type { ProjectOptions } from "../../core/project-options.js";

/**
 * Builds the application in a format that can be passed to workerd
 *
 * It saves the output in a `.worker-next` directory
 *
 * @param options The OpenNext options
 * @param config The OpenNext config
 * @param projectOpts The options for the project
 */
export async function build(
  options: BuildOptions,
  config: OpenNextConfig,
  projectOpts: ProjectOptions
): Promise<void> {
  // Do not minify the code so that we can apply string replacement patch.
  // Note that bundler will still minify the bundle.
  options.minify = false;

  // Pre-build validation
  buildHelper.checkRunningInsideNextjsApp(options);
  logger.info(`App directory: ${options.appPath}`);
  buildHelper.printNextjsVersion(options);
  ensureNextjsVersionSupported(options);
  const { aws, azion } = getVersion();
  logger.info(`@aziontech/opennextjs-azion version: ${azion}`);
  logger.info(`@opennextjs/aws version: ${aws}`);

  if (projectOpts.skipNextBuild) {
    logger.warn("Skipping Next.js build");
  } else {
    // Build the next app
    printHeader("Building Next.js app");
    setStandaloneBuildMode(options);
    buildNextjsApp(options);
  }

  // Generate deployable bundle
  printHeader("Generating bundle");
  buildHelper.initOutputDir(options);

  // Compile cache.ts
  compileCache(options);

  // Compile .env files
  compileEnvFiles(options);

  // Compile workerd init
  compileInit(options);

  // Compile middleware
  await createMiddleware(options, { forceOnlyBuildOnce: true });

  createStaticAssets(options);

  if (config.dangerous?.disableIncrementalCache !== true) {
    const { useTagCache, metaFiles } = createCacheAssets(options);
    if (useTagCache) {
      await compileTagAssets(metaFiles, options);
    }
  }

  await createServerBundle(options);

  await bundleServer(options);

  logger.info("OpenNext build complete.");
}

function ensureNextjsVersionSupported(options: buildHelper.BuildOptions) {
  if (buildHelper.compareSemver(options.nextVersion, "<", "13.0.0")) {
    logger.error("Next.js version unsupported, please upgrade to version 13.0 or greater.");
    process.exit(1);
  }
}
