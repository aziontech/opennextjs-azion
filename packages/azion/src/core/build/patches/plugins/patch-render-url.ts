/**
 * Inline `getBuildId` as it relies on `readFileSync` that is not supported by workerd.
 */

import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import type { ContentUpdater, Plugin } from "@opennextjs/aws/plugins/content-updater.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";

// this is a workaround for the fact that the `render` method in `next-server.js`
// is not compatible with workerd, as it relies on `req.url` to be set to the original URL
// Contains issue opened in open-nextjs/aws https://github.com/opennextjs/opennextjs-aws/issues/848
export function inlinePatchRenderUrl(updater: ContentUpdater): Plugin {
  return updater.updateContent("patch-render-url", [
    {
      field: {
        filter: getCrossPlatformPathRegex(String.raw`/next/dist/server/next-server\.js$`, {
          escape: false,
        }),
        contentFilter: /render\(/,
        callback: ({ contents }) => patchCode(contents, ruleRenderUrl),
      },
    },
  ]);
}

export const ruleRenderUrl = `
rule:
  kind: method_definition
  has:
    field: name
    regex: ^render$
fix: |-
  async render(...args) {
    const [req, res, pathname, query, parsedUrl, internal = false] = args;
    req.url = req.headers["x-original-url"] || req.url;
    return super.render(this.normalizeReq(req), this.normalizeRes(res), pathname, query, parsedUrl, internal);
  }
`;
