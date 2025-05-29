import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import type { ContentUpdater, Plugin } from "@opennextjs/aws/plugins/content-updater.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";

// Required for the rewrite catch-all to work, e.g. /api/slug*
export function inlinePatchRewriteRouter(updater: ContentUpdater): Plugin {
  return updater.updateContent("patch-rewrite-router", [
    {
      field: {
        filter: getCrossPlatformPathRegex(String.raw`/server-functions/default/index\.mjs$`, {
          escape: false,
        }),
        contentFilter: /function handleRewrites\s*\(/,
        callback: ({ contents }) => patchCode(contents, ruleRewriteRouter),
      },
    },
  ]);
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
