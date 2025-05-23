import { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

import { runBundler } from "../../core/utils/run-bundler.js";
import { populateCache } from "./populate-cache.js";
import path from "path";
import { copyAssets } from "../../core/utils/copy-assets.js";

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
