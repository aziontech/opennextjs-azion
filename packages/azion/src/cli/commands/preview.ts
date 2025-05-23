import fs from "fs/promises";
import { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

import { runBundler } from "../../core/utils/run-bundler.js";
import path from "path";
import { populateCache } from "./populate-cache.js";
import { copyAssets } from "../../core/utils/copy-assets.js";

export async function preview(
  options: BuildOptions,
  config: OpenNextConfig,
  previewOptions: { assetsDir: string; cacheDir: string; bundlerVersion: string; passthroughArgs: string[] }
) {
  // check if file azion.config.js exists
  const configExtensions = [".cjs", ".js", ".mjs", ".ts"];
  let configFile: string | undefined;

  for (const ext of configExtensions) {
    const filePath = `${options.monorepoRoot}/azion.config${ext}`;
    try {
      await fs.access(filePath);
      configFile = filePath;
      break;
    } catch {
      // File does not exist, continue to the next extension
    }
  }
  // TODO: remove this, when enable bundler command dev to receive --entry argument
  if (!configFile) {
    await new Promise((resolve) => {
      resolve(
        runBundler(
          options,
          [
            "build",
            "--preset",
            "javascript",
            "--entry",
            path.resolve(options.outputDir, "worker.js"),
            ...previewOptions.passthroughArgs,
          ],
          {
            logging: "all",
            version: previewOptions.bundlerVersion,
          }
        )
      );
    });
  }
  const port = previewOptions.passthroughArgs.find((arg) => arg.startsWith("--port="));
  const portValue = port ? port.split("=")[1] : "3000";

  // Copy static assets to the cache directory
  copyAssets(path.join(options.outputDir, "assets"), path.join(previewOptions.assetsDir));

  // Populate the cache
  await populateCache(options, config, {
    cacheDir: previewOptions.cacheDir,
  });

  runBundler(options, ["dev", "--port", portValue!, ...previewOptions.passthroughArgs], {
    logging: "all",
    version: previewOptions.bundlerVersion,
  });
}
