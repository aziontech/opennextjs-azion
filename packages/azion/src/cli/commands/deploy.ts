/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import path from "node:path";

import { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

import { copyAssets } from "../../core/utils/copy-assets.js";
import { runBundler } from "../../core/utils/run-bundler.js";
import { populateCache } from "./populate-cache.js";

export async function deploy(
  options: BuildOptions,
  config: OpenNextConfig,
  deployOptions: { assetsDir: string; cacheDir: string; bundlerVersion: string; passthroughArgs: string[] }
) {
  // Run the build command
  runBundler(options, ["build", ...deployOptions.passthroughArgs], {
    logging: "all",
    version: deployOptions.bundlerVersion,
  });

  // Copy static assets to the cache directory
  copyAssets(path.join(options.outputDir, "assets"), path.join(deployOptions.assetsDir));

  // Populate the cache
  await populateCache(options, config, {
    cacheDir: deployOptions.cacheDir,
  });
}
