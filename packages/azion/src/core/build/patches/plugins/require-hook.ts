/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { join } from "node:path";

import type { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";
import type { Plugin } from "esbuild";

export function shimRequireHook(options: BuildOptions): Plugin {
  return {
    name: "replaceRelative",
    setup(build) {
      // Note: we (empty) shim require-hook modules as they generate problematic code that uses requires
      build.onResolve(
        { filter: getCrossPlatformPathRegex(String.raw`^\./require-hook$`, { escape: false }) },
        () => ({
          path: join(options.outputDir, "azion-runtime/shims/empty.js"),
        })
      );
      build.onResolve(
        { filter: getCrossPlatformPathRegex(String.raw`^\./node-environment$`, { escape: false }) },
        () => ({
          path: join(options.outputDir, "azion-runtime/shims/empty.js"),
        })
      );
    },
  };
}
