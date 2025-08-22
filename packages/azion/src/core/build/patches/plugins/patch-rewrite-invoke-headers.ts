import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import type { ContentUpdater, Plugin } from "@opennextjs/aws/plugins/content-updater.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";

// This rule rewrites the `invokeHeaders` function to use the `routingResult` object
// send headers from the next.js server
export function inlinePatchRewriteInvokeHeaders(updater: ContentUpdater): Plugin {
  return updater.updateContent("patch-rewrite-invoke-headers", [
    {
      filter: getCrossPlatformPathRegex(String.raw`/server-functions/default/index\.mjs$`, {
        escape: false,
      }),
      contentFilter: /async function processRequest\s*\(/,
      callback: ({ contents }) => patchCode(contents, ruleRewriteInvokeHeaders),
    },
  ]);
}

// Rule to rewrite the `invokeHeaders` function
export const ruleRewriteInvokeHeaders = `
rule:
  inside:
    pattern: function processRequest($$$) { $$$ }
    stopBy: end
    field: body 
  pattern: |
    const requestMetadata = $$$META;
fix: |-
  req.headers['x-invoke-path'] = routingResult.internalEvent.rawPath;
  req.headers['x-invoke-query'] = JSON.stringify(routingResult.internalEvent.query);
  if (invokeStatus) {
    req.headers['x-invoke-status'] = invokeStatus;
  }
  const requestMetadata = $$$META;
`;

// send initial URL to next.js server
export function inlinePatchRewriteURLSource(updater: ContentUpdater): Plugin {
  return updater.updateContent("patch-rewrite-url-source", [
    {
      filter: getCrossPlatformPathRegex(String.raw`/server-functions/default/index\.mjs$`, {
        escape: false,
      }),
      contentFilter: /async function openNextHandler\s*\(/,
      callback: ({ contents }) => patchCode(contents, ruleRewriteURLSource),
    },
  ]);
}

export const ruleRewriteURLSource = `
rule:
  pattern: |
      const { search, pathname, hash } = new URL(preprocessedEvent.url);
fix: |-
  const { search, pathname, hash } = new URL(routingResult.initialURL);
`;
