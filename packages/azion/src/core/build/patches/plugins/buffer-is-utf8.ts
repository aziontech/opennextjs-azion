/**
 * Next 16.4+ calls `isUtf8` from `node:buffer` when inlining the RSC payload in the HTML.
 * The `node:buffer` polyfill does not implement it, so the call is replaced with an equivalent check.
 */

import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import type { ContentUpdater, Plugin } from "@opennextjs/aws/plugins/content-updater.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";

export function patchBufferIsUtf8(updater: ContentUpdater): Plugin {
  return updater.updateContent("buffer-is-utf8", [
    {
      filter: getCrossPlatformPathRegex(
        String.raw`/next/dist/(server/app-render/stream-ops\.node|compiled/next-server/app-page[^/]*\.runtime\.prod)\.js$`,
        { escape: false }
      ),
      contentFilter: /\.isUtf8\)/,
      callback: async ({ contents }) => patchCode(contents, isUtf8Rule),
    },
  ]);
}

/**
 * Replaces `(0, buffer.isUtf8)(chunk)` with a `TextDecoder` check.
 */
export const isUtf8Rule = `
rule:
  pattern: (0, $BUFFER.isUtf8)($CHUNK)
fix: |-
  ((chunk) => {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(chunk);
      return true;
    } catch {
      return false;
    }
  })($CHUNK)
`;
