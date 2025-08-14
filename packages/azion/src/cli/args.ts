/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { mkdirSync, type Stats, statSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

export type Arguments = (
  | {
      command: "build";
      skipNextBuild: boolean;
      minify: boolean;
      assetsDir?: string;
    }
  | {
      command: "preview" | "deploy";
      passthroughArgs: string[];
      assetsDir?: string;
      cacheDir?: string;
      skipNextBuild: boolean;
      bundlerVersion?: string;
    }
  | {
      command: "populateCache";
      assetsDir?: string;
      cacheDir?: string;
    }
  | {
      command: "populateAssets";
      assetsDir?: string;
    }
) & { outputDir?: string };

export function getArgs(): Arguments {
  const { positionals, values } = parseArgs({
    options: {
      skipBuild: { type: "boolean", short: "s", default: false },
      output: { type: "string", short: "o" },
      noMinify: { type: "boolean", default: false },
      bundlerVersion: { type: "string", default: "latest" }, // Default to latest version
      assetsDir: { type: "string", default: ".edge/storage" },
      cacheDir: { type: "string", default: ".edge/storage" },
    },
    allowPositionals: true,
  });

  const outputDir = values.output ? resolve(values.output) : undefined;
  if (outputDir) assertDirArg(outputDir, "output", true);

  switch (positionals[0]) {
    case "build":
      return {
        command: "build",
        outputDir,
        skipNextBuild:
          values.skipBuild || ["1", "true", "yes"].includes(String(process.env.SKIP_NEXT_APP_BUILD)),
        minify: !values.noMinify,
      };
    case "preview":
      return {
        command: "preview",
        passthroughArgs: getPassthroughArgs(),
        outputDir,
        assetsDir: values.assetsDir,
        cacheDir: values.cacheDir,
        bundlerVersion: values.bundlerVersion,
        skipNextBuild:
          values.skipBuild || ["1", "true", "yes"].includes(String(process.env.SKIP_NEXT_APP_BUILD)),
      };
    case "deploy":
      return {
        command: "deploy",
        passthroughArgs: getPassthroughArgs(),
        outputDir,
        assetsDir: values.assetsDir,
        cacheDir: values.cacheDir,
        bundlerVersion: values.bundlerVersion,
        skipNextBuild:
          values.skipBuild || ["1", "true", "yes"].includes(String(process.env.SKIP_NEXT_APP_BUILD)),
      };

    case "populateCache":
      return {
        command: "populateCache",
        outputDir,
        cacheDir: values.cacheDir,
      };

    case "populateAssets":
      return {
        command: "populateAssets",
        outputDir,
        assetsDir: values.assetsDir,
      };

    default:
      throw new Error(
        "Error: invalid command, expected 'build' | 'preview' | 'deploy' | 'populateCache' | 'populateAssets'"
      );
  }
}

export function getPassthroughArgs() {
  const passthroughPos = process.argv.indexOf("--");
  return passthroughPos === -1 ? [] : process.argv.slice(passthroughPos + 1);
}

function assertDirArg(path: string, argName?: string, make?: boolean) {
  let dirStats: Stats;
  try {
    dirStats = statSync(path);
  } catch {
    if (!make) {
      throw new Error(`Error: the provided${argName ? ` "${argName}"` : ""} input is not a valid path`);
    }
    mkdirSync(path);
    return;
  }

  if (!dirStats.isDirectory()) {
    throw new Error(`Error: the provided${argName ? ` "${argName}"` : ""} input is not a directory`);
  }
}
