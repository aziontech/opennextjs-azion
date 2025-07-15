/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

import type { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { compareSemver } from "@opennextjs/aws/build/helper.js";
import logger from "@opennextjs/aws/logger.js";
import prettier from "prettier";

type BundlerOptions = {
  port?: number;
  debug?: boolean;
  logging?: "error" | "all" | "pipe";
  version?: string;
};

/**
 * Checks the package.json `packageManager` field to determine whether yarn modern is used.
 *
 * @param options Build options.
 * @returns Whether yarn modern is used.
 */
function isYarnModern(options: BuildOptions) {
  const packageJson: { packageManager?: string } = JSON.parse(
    fs.readFileSync(path.join(options.monorepoRoot, "package.json"), "utf-8")
  );

  if (!packageJson.packageManager?.startsWith("yarn")) return false;

  const [, version] = packageJson.packageManager.split("@");
  return version ? compareSemver(version, ">=", "4.0.0") : false;
}

/**
 * Prepends CLI flags with `--` so that certain package managers can pass args through to wrangler
 * properly.
 *
 * npm and yarn classic require `--` to be used, while pnpm and bun require that it is not used.
 *
 * @param options Build options.
 * @param args CLI args.
 * @returns Arguments with a passthrough flag injected when needed.
 */
export function injectPassthroughFlagForArgs(options: BuildOptions, args: string[]) {
  if (options.packager === "yarn" && !isYarnModern(options)) {
    return args;
  }

  if (options.packager !== "npm" && (options.packager !== "yarn" || isYarnModern(options))) {
    return args;
  }

  const flagInArgsIndex = args.findIndex((v) => v.startsWith("--"));
  if (flagInArgsIndex !== -1) {
    args.splice(flagInArgsIndex, 0, "--");
  }

  return args;
}

export function runBundler(_options: BuildOptions, args: string[], bundlerOpts: BundlerOptions = {}) {
  const packageName = `edge-functions@${bundlerOpts.version}`;
  const result = spawnSync("npx", [packageName, ...args], {
    shell: true,
    stdio:
      bundlerOpts.logging === "error"
        ? ["ignore", "ignore", "inherit"]
        : bundlerOpts.logging === "pipe"
          ? "pipe"
          : "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: "--experimental-vm-modules --no-warnings",
      ...(bundlerOpts.logging === "error" ? { BUNDLER_LOG: "error" } : undefined),
    },
  });

  if (result.status !== 0) {
    logger.error("Bundler command failed");
    process.exit(1);
  }
  return bundlerOpts.logging === "pipe"
    ? {
        stdout: result.stdout ? result.stdout.toString() : "",
        stderr: result.stderr ? result.stderr.toString() : "",
      }
    : undefined;
}

// TODO: Remove this when Azion Bundler generate by command generate config
export const azionConfigExists = async (options: BuildOptions): Promise<boolean> => {
  const configExtensions = [".cjs", ".js", ".mjs", ".ts"];
  for (const ext of configExtensions) {
    const filePath = `${options.monorepoRoot}/azion.config${ext}`;
    try {
      await fsPromises.access(filePath);
      return true; // Config file exists
    } catch {
      // File does not exist, continue to the next extension
    }
  }
  return false; // No config file found
};

// TODO: Remove this when Azion Bundler generate by command generate config
function isCommonJS(): boolean {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return packageJson.type !== "module";
  }

  return true;
}

// TODO: Remove this when Azion Bundler generate by command generate config
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createAzionConfig(options: BuildOptions, configAzion: Record<string, any>) {
  const useCommonJS = isCommonJS();
  const extension = useCommonJS ? ".cjs" : ".mjs";
  const configFileName = path.join(options.monorepoRoot, `azion.config${extension}`);
  const moduleExportStyle = useCommonJS ? "module.exports =" : "export default";

  const configComment = `/**
 * This file was automatically generated based on your preset configuration.
 * 
 * For better type checking and IntelliSense:
 * 1. Install azion as dev dependency:
 *    npm install -D azion
 * 
 * 2. Use defineConfig:
 *    import { defineConfig } from 'azion'
 * 
 * 3. Replace the configuration with defineConfig:
 *    export default defineConfig({
 *      // Your configuration here
 *    })
 * 
 * For more configuration options, visit:
 * https://github.com/aziontech/lib/tree/main/packages/config
 */\n\n`;

  const replacer = (_key: string, value: unknown) => {
    if (typeof value === "function") {
      return `__FUNCTION_START__${value.toString()}__FUNCTION_END__`;
    }
    return value;
  };

  const formattedContent = await prettier.format(
    configComment + `${moduleExportStyle} ${JSON.stringify(configAzion, replacer, 2)};`,
    {
      parser: "babel",
      semi: false,
      singleQuote: true,
      trailingComma: "none",
    }
  );

  await fsPromises
    .writeFile(path.resolve(options.monorepoRoot, configFileName), formattedContent, "utf-8")
    .catch((err) => {
      logger.error("Error writing Azion config file:", err);
      process.exit(1);
    });
}

export const commandBuildBundler = async (
  options: BuildOptions,
  skipFrameworkBuild: boolean,
  passthroughArgs: string[],
  bundlerOpts: BundlerOptions = {}
) => {
  await new Promise((resolve) => {
    resolve(
      runBundler(
        options,
        [
          "build",
          "--preset",
          "opennextjs",
          "--entry",
          path.resolve(options.outputDir, "worker.js"),
          skipFrameworkBuild ? "--skip-framework-build" : "",
          ...passthroughArgs,
        ],
        bundlerOpts
      )
    );
  });
};
