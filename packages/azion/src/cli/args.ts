import { mkdirSync, type Stats, statSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { getWranglerEnvironmentFlag } from "../core/utils/run-bundler.js";

export type Arguments = (
  | {
      command: "build";
      skipNextBuild: boolean;
      skipWranglerConfigCheck: boolean;
      minify: boolean;
    }
  | {
      command: "preview" | "deploy" | "upload";
      passthroughArgs: string[];
    }
  | {
      command: "populateCache";
      environment?: string;
      destinationCacheDir?: string;
    }
) & { outputDir?: string };

export function getArgs(): Arguments {
  const { positionals, values } = parseArgs({
    options: {
      skipBuild: { type: "boolean", short: "s", default: false },
      output: { type: "string", short: "o" },
      noMinify: { type: "boolean", default: false },
      skipWranglerConfigCheck: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const outputDir = values.output ? resolve(values.output) : undefined;
  if (outputDir) assertDirArg(outputDir, "output", true);

  const passthroughArgs = getPassthroughArgs();

  switch (positionals[0]) {
    case "build":
      return {
        command: "build",
        outputDir,
        skipNextBuild:
          values.skipBuild || ["1", "true", "yes"].includes(String(process.env.SKIP_NEXT_APP_BUILD)),
        skipWranglerConfigCheck:
          values.skipWranglerConfigCheck ||
          ["1", "true", "yes"].includes(String(process.env.SKIP_WRANGLER_CONFIG_CHECK)),
        minify: !values.noMinify,
      };
    case "preview":
    case "deploy":
    case "upload":
      return {
        command: positionals[0],
        outputDir,
        passthroughArgs,
      };
    case "populateCache":
      return {
        command: "populateCache",
        outputDir,
        environment: getWranglerEnvironmentFlag(passthroughArgs),
      };
    default:
      throw new Error(
        "Error: invalid command, expected 'build' | 'preview' | 'deploy' | 'upload' | 'populateCache'"
      );
  }
}

function getPassthroughArgs() {
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
