import { writeFileSync } from "node:fs";
import path from "node:path";

import { BuildOptions } from "@opennextjs/aws/build/helper";
import { TagCacheMetaFile } from "@opennextjs/aws/types/cache";
import { NAME_FILE_TAG_MANIFEST } from "../core/overrides/internal.js";

export const compileTagAssets = async (
  metaFiles: TagCacheMetaFile[],
  options: BuildOptions
): Promise<void> => {
  const tagsPath = path.join(options.outputDir, "azion", NAME_FILE_TAG_MANIFEST);
  const items = metaFiles.map((files) => {
    return { tag: files.tag.S, path: files.path.S };
  });
  writeFileSync(tagsPath, JSON.stringify({ items }), "utf-8");
};
