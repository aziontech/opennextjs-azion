/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const libDirPath = path.join(__dirname, "/../../runtime");

/**
 * Utility for getting the resolved path to the package's runtime directory
 *
 * @returns the resolved path of the runtime directory
 */
export function getPackageRuntimeDirPath(): string {
  return libDirPath;
}
