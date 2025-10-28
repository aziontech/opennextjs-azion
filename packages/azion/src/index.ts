#!/usr/bin/env node
/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { createRequire } from "node:module";
import path from "node:path";

import { compileOpenNextConfig } from "@opennextjs/aws/build/compileConfig.js";
import { normalizeOptions } from "@opennextjs/aws/build/helper.js";
import { printHeader, showWarningOnWindows } from "@opennextjs/aws/build/utils.js";
import logger from "@opennextjs/aws/logger.js";

import { Arguments, getArgs } from "./cli/args.js";
import { build } from "./cli/commands/build.js";
import { deploy } from "./cli/commands/deploy.js";
import { populateAssets } from "./cli/commands/populate-assets.js";
import { populateCache } from "./cli/commands/populate-cache.js";
import { preview } from "./cli/commands/preview.js";
import { createOpenNextConfigIfNotExistent, ensureAzionConfig } from "./core/build/utils/index.js";
import * as buildHelper from "@opennextjs/aws/build/helper.js";

const nextAppDir = process.cwd();

async function runCommand(args: Arguments) {
  printHeader(`Azion ${args.command}`);

  showWarningOnWindows();

  const baseDir = nextAppDir;
  const require = createRequire(import.meta.url);
  const openNextDistDir = path.dirname(require.resolve("@opennextjs/aws/index.js"));

  const configPath = await createOpenNextConfigIfNotExistent(baseDir);
  const { config, buildDir } = await compileOpenNextConfig(configPath, {
    compileEdge: true,
  });

  ensureAzionConfig(config);

  // Initialize options
  const options = normalizeOptions(config, openNextDistDir, buildDir);
  logger.setLevel(options.debug ? "debug" : "info");
  // Turbopack is not supported for build at the moment, so we disable it
  const nextVersion = buildHelper.getNextVersion(baseDir);
  const isNext16OrHigher = buildHelper.compareSemver(nextVersion, ">=", "16");
  config.buildCommand = makeBuildCommand(options.packager, isNext16OrHigher);

  switch (args.command) {
    case "build":
      return build(options, config, {
        ...args,
        sourceDir: baseDir,
      });
    case "preview":
      return preview(options, config, args);
    case "deploy":
      return deploy(options, config, args);
    case "populateCache":
      return populateCache(options, config, args);
    case "populateAssets":
      return populateAssets(options, args);
  }
}

/**
 * Creates the build command for the given packager.
 * This is a temporary fix to avoid the following error on Next 16 or Build with TURBOPACK
 * turbopack builds are not suported for build at the moment, so we disable it
 * @param packager
 * @returns
 */
function makeBuildCommand(packager: string, isNext16OrHigher: boolean) {
  if (!isNext16OrHigher) {
    return;
  }
  return ["bun", "npm"].includes(packager)
    ? `${packager} run build -- --webpack`
    : // yarn
      ["yarn"].includes(packager)
      ? `${packager} build --webpack`
      : `${packager} build -- --webpack`;
}

await runCommand(getArgs());
