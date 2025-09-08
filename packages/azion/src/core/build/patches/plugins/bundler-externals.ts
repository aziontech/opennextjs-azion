/**
 * ESBuild plugin to mark files bundled by wrangler as external.
 *
 * `.wasm` and `.bin` will ultimately be bundled by wrangler.
 * We should only mark them as external in the adapter.
 *
 * However simply marking them as external would copy the import path to the bundle,
 * i.e. `import("./file.wasm?module")` and given than the bundle is generated in a
 * different location than the input files, the relative path would not be valid.
 *
 * This ESBuild plugin convert relative paths to absolute paths so that they are
 * still valid from inside the bundle.
 *
 * ref: https://developers.cloudflare.com/workers/wrangler/bundling/
 */

import fs from "node:fs";
import path from "node:path";

import { BuildOptions } from "@opennextjs/aws/build/helper.js";
import type { PluginBuild } from "esbuild";

// import { normalizePath } from "../../utils/normalize-path.js";

export function setBundlerExternal(buildOpts: BuildOptions) {
  return {
    name: "bundler-externals",

    setup: async (build: PluginBuild) => {
      const namespace = "bundler-externals-plugin";

      //TODO: Ideally in the future we would like to analyze the files in case they are using wasm in a Node way (i.e. WebAssembly.instantiate)
      build.onResolve({ filter: /(\.bin|\.wasm(\?module)?)$/ }, (args) => {
        const absPath = path.resolve(args.resolveDir, args.path);
        return {
          path: absPath,
          namespace,
        };
      });

      build.onLoad({ filter: /.*/, namespace }, async (args) => {
        const fileName = path.basename(args.path);
        const fileNameWithoutQuery = fileName.split("?")[0];

        if (!fileNameWithoutQuery) {
          return;
        }
        // move file .open-next/assets to .open-next/assets
        const filePath = args.path.split("?")[0]!;
        // TODO: this is a workaround to move the files to the correct location
        // the future move will be done by the bundler or by the build process
        try {
          fs.copyFileSync(filePath, path.join(buildOpts.outputDir, "assets", fileNameWithoutQuery));
        } catch (error) {
          console.error(error);
        }
        return {
          contents: `export default 'file:///${fileName}';`,
          loader: "js",
        };
      });
    },
  };
}
