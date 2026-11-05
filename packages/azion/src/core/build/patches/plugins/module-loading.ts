/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
/**
 * Scope Next.js module-loading signals to the current request.
 *
 * Next.js shares one timer-backed CacheSignal across all requests. Store the signal on the
 * OpenNext request store instead, and use the original module-level variable outside a request.
 */

import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import type { ContentUpdater, Plugin } from "@opennextjs/aws/plugins/content-updater.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";

export function patchModuleLoadingSignal(updater: ContentUpdater): Plugin {
  return updater.updateContent("module-loading-signal", [
    {
      filter: getCrossPlatformPathRegex(
        String.raw`/next/dist/server/app-render/module-loading/track-module-loading\.instance\.js$`,
        { escape: false }
      ),
      contentFilter: /getModuleLoadingSignal/,
      callback: async ({ contents }) => patchCode(contents, moduleLoadingSignalRule),
    },
  ]);
}

/**
 * Replaces the body of `getModuleLoadingSignal()` to scope the signal to the request.
 *
 * The constructor arguments are forwarded as-is: Next.js 15 calls `new CacheSignal()` while Next.js 16 calls
 * `new CacheSignal(null)`.
 */
export const moduleLoadingSignalRule = `
rule:
  kind: statement_block
  inside:
    kind: function_declaration
    field: body
    has:
      field: name
      regex: ^getModuleLoadingSignal$
  has:
    pattern: $SIGNAL = new $CACHE_SIGNAL.CacheSignal($$$ARGS)
    stopBy: end
fix: |-
  {
    const requestStore = globalThis.__openNextAls?.getStore();
    if (requestStore) {
      return requestStore.moduleLoadingSignal ??= new $CACHE_SIGNAL.CacheSignal($$$ARGS);
    }
    return $SIGNAL ??= new $CACHE_SIGNAL.CacheSignal($$$ARGS);
  }
`;
