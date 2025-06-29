/**
 * This code was originally copied and modified from the @opennextjs/aws repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { createPatchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import type { CodePatcher } from "@opennextjs/aws/build/patch/codePatcher.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";

export const rule = `
rule:
  kind: call_expression
  pattern: $PROMISE
  all:
    - has: { pattern: $_.arrayBuffer().then, stopBy: end }
    - has: { pattern: "Buffer.from", stopBy: end }
    - any:
        - inside:
            kind: sequence_expression
            inside:
                kind: return_statement
        - inside:
            kind: expression_statement
            precedes:
                kind: return_statement
    - has: { pattern: $_.FETCH, stopBy: end }

fix: |
  globalThis.__openNextAls?.getStore()?.waitUntil?.($PROMISE)
`;

export const patchFetchCacheSetMissingWaitUntil: CodePatcher = {
  name: "patch-fetch-cache-set-missing-wait-until",
  patches: [
    {
      versions: ">=13.0.0",
      field: {
        pathFilter: getCrossPlatformPathRegex(
          String.raw`(server/chunks/.*\.js|.*\.runtime\..*\.js|patch-fetch\.js)$`,
          { escape: false }
        ),
        contentFilter: /arrayBuffer\(\)\s*\.then/,
        patchCode: createPatchCode(rule),
      },
    },
  ],
};
