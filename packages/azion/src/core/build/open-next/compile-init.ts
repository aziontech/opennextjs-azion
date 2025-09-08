/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "@opennextjs/aws/adapters/config/util.js";
import type { BuildOptions } from "@opennextjs/aws/build/helper";
import { build } from "esbuild";

/**
 * Compiles the initialization code for the workerd runtime
 */
export async function compileInit(options: BuildOptions) {
  const currentDir = path.join(path.dirname(fileURLToPath(import.meta.url)));
  const Dir = path.join(currentDir, "../../runtime");
  const initPath = path.join(Dir, "init.js");

  const nextConfig = loadConfig(path.join(options.appBuildOutputPath, ".next"));
  const basePath = nextConfig.basePath ?? "";
  const deploymentId = nextConfig.deploymentId ?? "";

  await build({
    entryPoints: [initPath],
    outdir: path.join(options.outputDir, "azion"),
    bundle: false,
    minify: false,
    format: "esm",
    target: "esnext",
    platform: "node",
    define: {
      __BUILD_TIMESTAMP_MS__: JSON.stringify(Date.now()),
      __NEXT_BASE_PATH__: JSON.stringify(basePath),
      __DEPLOYMENT_ID__: JSON.stringify(deploymentId),
    },
  });
}
