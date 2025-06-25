/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { BuildOptions } from "@opennextjs/aws/build/helper.js";
import logger from "@opennextjs/aws/logger.js";
import { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

import { azionConfigExists, createAzionConfig, runBundler } from "../../core/utils/run-bundler.js";

export async function preview(
  options: BuildOptions,
  _config: OpenNextConfig,
  previewOptions: {
    assetsDir: string;
    cacheDir: string;
    bundlerVersion?: string;
    skipNextBuild: boolean;
    passthroughArgs: string[];
  }
) {
  // build bundler if it is not already built
  const configFile = await azionConfigExists(options);
  if (!configFile) {
    logger.warn("Azion config file not found. Running bundler build to generate the config file...");
    // command read preset config
    const result = runBundler(options, ["presets", "config", "opennextjs"], {
      logging: "pipe",
      version: previewOptions.bundlerVersion,
    });
    if (result?.stderr) {
      logger.error("Error generating Azion config file:", result.stderr);
      process.exit(1);
    }
    const configAzion = JSON.parse(result?.stdout || "{}");
    await createAzionConfig(options, configAzion);
    logger.info(">>> Azion config file generated successfully.");
  }

  const port = previewOptions.passthroughArgs.find((arg) => arg.startsWith("--port="));
  const portValue = port ? port.split("=")[1] : "3000";

  runBundler(
    options,
    [
      "dev",
      "--port",
      portValue!,
      // if configFile is not found, skip framework build
      previewOptions.skipNextBuild ? "--skip-framework-build" : "",
      ...previewOptions.passthroughArgs,
    ],
    {
      logging: "all",
      version: previewOptions.bundlerVersion,
    }
  );
}
