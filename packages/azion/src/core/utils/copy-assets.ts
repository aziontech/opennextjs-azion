/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

import logger from "@opennextjs/aws/logger.js";

export function copyAssets(target: string, destination: string) {
  logger.info("\nPopulating assets...");
  const targetDir = path.join(target);
  if (existsSync(destination)) {
    rmSync(destination, { recursive: true, force: true });
  }
  cpSync(targetDir, destination, {
    recursive: true,
  });
  logger.info(`Successfully populated assets`);
}
