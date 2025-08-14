import path from "node:path";

import { BuildOptions } from "@opennextjs/aws/build/helper.js";

import { copyAssets } from "../../core/utils/copy-assets.js";

export async function populateAssets(options: BuildOptions, previewOptions: { assetsDir?: string }) {
  // Copy static assets to the cache directory
  copyAssets(path.join(options.outputDir, "assets"), path.join(previewOptions.assetsDir!));
}
