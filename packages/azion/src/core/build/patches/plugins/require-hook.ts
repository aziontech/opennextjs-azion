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
      // Next 16.2+ also imports them by package path (from `next/dist/build/adapter/setup-node-env.external.js`)
      build.onResolve(
        {
          filter: getCrossPlatformPathRegex(
            String.raw`^(\./require-hook|next/dist/server/require-hook(\.js)?)$`,
            { escape: false }
          ),
        },
        () => ({
          path: join(options.outputDir, "azion-runtime/shims/empty.js"),
        })
      );
      build.onResolve(
        {
          filter: getCrossPlatformPathRegex(
            String.raw`^(\./node-environment|next/dist/server/node-environment(\.js)?)$`,
            { escape: false }
          ),
        },
        () => ({
          path: join(options.outputDir, "azion-runtime/shims/empty.js"),
        })
      );
    },
  };
}
