import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { type BuildOptions } from "@opennextjs/aws/build/helper.js";
import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import type { ContentUpdater, Plugin } from "@opennextjs/aws/plugins/content-updater.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";

import { patchCodeWithValidations } from "../../utils/index.js";

// Required for the rewrite catch-all to work, e.g. /api/slug*
export function inlinePatchRewriteRouter(updater: ContentUpdater): Plugin {
  return updater.updateContent("patch-rewrite-router", [
    {
      filter: getCrossPlatformPathRegex(String.raw`/server-functions/default/index\.mjs$`, {
        escape: false,
      }),
      contentFilter: /function handleRewrites\s*\(/,
      callback: ({ contents }) => patchCode(contents, ruleRewriteRouter),
    },
  ]);
}

// `createMiddleware()` (from @opennextjs/aws) bundles `middleware/handler.mjs` on its own,
// outside of `bundleServer()`'s esbuild/ContentUpdater pipeline, so `inlinePatchRewriteRouter`
// never gets a chance to run against it. It still contains the same `handleRewrites`
// implementation (from core/routing/matcher.js), so we patch it as a plain post-build step,
// same as `inlineMiddlewareManifestRequire`.
export function inlineMiddlewareRewriteRouter(code: string): string {
  return patchCode(code, ruleRewriteRouter);
}

export async function updateMiddlewareBundledCode(buildOpts: BuildOptions): Promise<void> {
  const middlewareHandlerFile = path.join(buildOpts.outputDir, "middleware", "handler.mjs");
  if (!existsSync(middlewareHandlerFile)) {
    return;
  }

  const code = await readFile(middlewareHandlerFile, "utf8");

  const patchedCode = await patchCodeWithValidations(code, [
    ["rewrite-router", inlineMiddlewareRewriteRouter],
  ]);

  await writeFile(middlewareHandlerFile, patchedCode);
}

export const ruleRewriteRouter = `
rule:
  kind: if_statement
  has:
    field: condition
    regex: isUsingParams
fix: |-
  if (isUsingParams) {
    Object.keys(params).forEach((key) => {
      if (
        typeof params[key] === "string" &&
        pathname.includes(\`:\${key}*\`) &&
        params[key].includes("/")
      ) {
        params[key] = params[key].split("/");
      }
    });
    rewrittenPath = unescapeRegex(toDestinationPath(params));
    rewrittenHost = unescapeRegex(toDestinationHost(params));
    rewrittenQuery = unescapeRegex(toDestinationQuery(params));
  }
`;
