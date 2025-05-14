import { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

import { getWranglerEnvironmentFlag, runBundler } from "../../core/utils/run-bundler.js";
import { populateCache } from "./populate-cache.js";

export async function deploy(
  options: BuildOptions,
  config: OpenNextConfig,
  deployOptions: { passthroughArgs: string[] }
) {
  await populateCache(options, config, {
    environment: getWranglerEnvironmentFlag(deployOptions.passthroughArgs),
  });

  runBundler(options, ["deploy", ...deployOptions.passthroughArgs], { logging: "all" });
}
