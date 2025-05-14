import fs from "fs/promises";
import { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

import { runBundler } from "../../core/utils/run-bundler.js";
import path from "path";
import { cpSync, existsSync, rmSync } from "fs";
import { populateCache } from "./populate-cache.js";

export async function preview(
  options: BuildOptions,
  config: OpenNextConfig,
  previewOptions: { passthroughArgs: string[] },
  previewConfig: { storageDir: string }
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
            version: "5.2.0-stage.2",
          }
        )
      );
    });
  }
  const port = previewOptions.passthroughArgs.find((arg) => arg.startsWith("--port="));
  const portValue = port ? port.split("=")[1] : "3000";

  // Populate the cache
  await populateCache(options, config, {});

  // remover folder storageDir
  const storageDir = path.join(options.appPath, previewConfig.storageDir);
  if (existsSync(storageDir)) {
    rmSync(storageDir, { recursive: true, force: true });
  }

  // Copy assets to the .edge directory
  cpSync(`${options.outputDir}/assets`, path.join(options.appPath, previewConfig.storageDir), {
    recursive: true,
  });

  runBundler(options, ["dev", "--port", portValue!, ...previewOptions.passthroughArgs], {
    logging: "all",
    version: "5.2.0-stage.2",
  });
}
