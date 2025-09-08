/**
 * This code was originally copied and modified from the @opennextjs/aws repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { createPatchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import type { CodePatcher } from "@opennextjs/aws/build/patch/codePatcher.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";

export const fetchRule = `
rule:
  kind: member_expression
  pattern: $WORK_STORE.isOnDemandRevalidate
  inside:
    kind: ternary_expression
    all:
      - has: {kind: 'null'}
      - has: 
          kind: await_expression
          has:
            kind: call_expression
            all:
              - has:
                  kind: member_expression
                  has:
                    kind: property_identifier
                    field: property
                    regex: get
              - has:
                  kind: arguments
                  has:
                    kind: object
                    has:
                      kind: pair
                      all:
                        - has:
                            kind: property_identifier
                            field: key
                            regex: softTags
    inside:
        kind: variable_declarator

fix:
  ($WORK_STORE.isOnDemandRevalidate && !globalThis.__openNextAls?.getStore()?.isISRRevalidation)
`;

export const unstable_cacheRule = `
rule:
  kind: member_expression
  pattern: $STORE_OR_CACHE.isOnDemandRevalidate
  inside:
    kind: if_statement
    stopBy: end
    has:
      kind: statement_block
      has:
        kind: variable_declarator
        has: 
          kind: await_expression
          has:
            kind: call_expression
            all:
              - has:
                  kind: member_expression
                  has:
                    kind: property_identifier
                    field: property
                    regex: get
              - has:
                  kind: arguments
                  has:
                    kind: object
                    has:
                      kind: pair
                      all:
                        - has:
                            kind: property_identifier
                            field: key
                            regex: softTags
        stopBy: end
fix:
  ($STORE_OR_CACHE.isOnDemandRevalidate && !globalThis.__openNextAls?.getStore()?.isISRRevalidation)
`;

export const useCacheRule = `
rule:
  kind: member_expression
  pattern: $STORE_OR_CACHE.isOnDemandRevalidate
  inside:
    kind: binary_expression
    has: 
      kind: member_expression
      pattern: $STORE_OR_CACHE.isDraftMode
    inside:
      kind: if_statement
      stopBy: end
      has: 
        kind: return_statement
        any:
          - has:
              kind: 'true'
          - has:
              regex: '!0'
        stopBy: end
fix:
  '($STORE_OR_CACHE.isOnDemandRevalidate && !globalThis.__openNextAls?.getStore()?.isISRRevalidation)'`;

export const patchFetchCacheForISR: CodePatcher = {
  name: "patch-fetch-cache-for-isr",
  patches: [
    {
      versions: ">=13.0.0",
      pathFilter: getCrossPlatformPathRegex(
        String.raw`(server/chunks/.*\.js|.*\.runtime\..*\.js|patch-fetch\.js)$`,
        { escape: false }
      ),
      contentFilter: /\.isOnDemandRevalidate/,
      patchCode: createPatchCode(fetchRule),
    },
  ],
};

export const patchUnstableCacheForISR: CodePatcher = {
  name: "patch-unstable-cache-for-isr",
  patches: [
    {
      versions: ">=13.0.0",
      pathFilter: getCrossPlatformPathRegex(
        String.raw`(server/chunks/.*\.js|.*\.runtime\..*\.js|spec-extension/unstable-cache\.js)$`,
        { escape: false }
      ),
      contentFilter: /\.isOnDemandRevalidate/,
      patchCode: createPatchCode(unstable_cacheRule),
    },
  ],
};
