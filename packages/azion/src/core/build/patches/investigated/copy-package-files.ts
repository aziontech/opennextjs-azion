import fs from "node:fs";
import path from "node:path";

import type { BuildOptions } from "@opennextjs/aws/build/helper.js";

import { getOutputWorkerPath } from "../../bundle-server.js";

/**
 * Copies
 * - the template files present in the azion package to `.open-next/azion-runtime`
 * - `worker.js` to `.open-next/`
 */
export function copyPackageCliFiles(packageDistDir: string, buildOpts: BuildOptions) {
  console.log("# copyPackageTemplateFiles");
  const sourceDir = path.join(packageDistDir, "runtime");

  const destinationDir = path.join(buildOpts.outputDir, "azion-runtime");

  fs.mkdirSync(destinationDir, { recursive: true });
  fs.cpSync(sourceDir, destinationDir, { recursive: true });

  fs.copyFileSync(path.join(packageDistDir, "runtime/worker.js"), getOutputWorkerPath(buildOpts));
}
