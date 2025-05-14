import { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

import { getWranglerEnvironmentFlag, runBundler } from "../../core/utils/run-bundler.js";
import { populateCache } from "./populate-cache.js";

export async function upload(
  options: BuildOptions,
  config: OpenNextConfig,
  uploadOptions: { passthroughArgs: string[] }
) {
  await populateCache(options, config, {
    environment: getWranglerEnvironmentFlag(uploadOptions.passthroughArgs),
  });

  runBundler(options, ["versions upload", ...uploadOptions.passthroughArgs], { logging: "all" });
}
