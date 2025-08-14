/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */

import { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

import { commandBuildBundler } from "../../core/utils/run-bundler.js";

export async function deploy(
  options: BuildOptions,
  _config: OpenNextConfig,
  deployOptions: {
    assetsDir?: string;
    cacheDir?: string;
    bundlerVersion?: string;
    skipNextBuild: boolean;
    passthroughArgs: string[];
  }
) {
  // Run the build command
  await commandBuildBundler(options, deployOptions.skipNextBuild, deployOptions.passthroughArgs, {
    logging: "all",
    version: deployOptions.bundlerVersion,
  });
}
