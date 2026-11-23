/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import path from "node:path";

import { loadFunctionsConfigManifest, loadMiddlewareManifest } from "@opennextjs/aws/adapters/config/util.js";
import * as buildHelper from "@opennextjs/aws/build/helper.js";

/**
 * Returns whether the project is using a Node.js middleware (`proxy.ts` in Next.js 16+).
 *
 * @param options Build options.
 * @returns Whether the project is using a Node.js middleware.
 */
export function useNodeMiddleware(options: buildHelper.BuildOptions): boolean {
  const buildOutputDotNextDir = path.join(options.appBuildOutputPath, ".next");

  // Look for the edge middleware
  const middlewareManifest = loadMiddlewareManifest(buildOutputDotNextDir);
  if (middlewareManifest.middleware["/"]) {
    return false;
  }

  // Look for the node middleware
  const functionsConfigManifest = loadFunctionsConfigManifest(buildOutputDotNextDir);
  return Boolean(functionsConfigManifest?.functions["/_middleware"]);
}
