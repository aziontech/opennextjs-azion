/**
 * - Remove a dependency on Babel by dropping the require of error-inspect
 * - Do not crash when `timers/promises.setImmediate` is getter-only (unenv polyfill)
 */

import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import type { ContentUpdater, Plugin } from "@opennextjs/aws/plugins/content-updater.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";

export function patchNodeEnvironment(updater: ContentUpdater): Plugin {
  return updater.updateContent("node-environment", [
    {
      filter: getCrossPlatformPathRegex(String.raw`/next/dist/server/node-environment\.js$`, {
        escape: false,
      }),
      contentFilter: /error-inspect/,
      callback: async ({ contents }) => patchCode(contents, errorInspectRule),
    },
    {
      filter: getCrossPlatformPathRegex(
        String.raw`/next/dist/server/node-environment-extensions/fast-set-immediate\.external\.js$`,
        { escape: false }
      ),
      contentFilter: /nodeTimersPromises\.setImmediate/,
      callback: async ({ contents }) => patchCode(contents, fastSetImmediateRule),
    },
  ]);
}

/**
 * Drops `require("./node-environment-extensions/error-inspect");`
 */
export const errorInspectRule = `
rule:
  pattern: require("./node-environment-extensions/error-inspect");
fix: |-
  // Removed by OpenNext
  // require("./node-environment-extensions/error-inspect");
`;

/**
 * Wraps the `timers/promises.setImmediate` override in a try/catch.
 *
 * The unenv polyfill exposes `setImmediate` as a getter-only property, so the assignment throws at runtime.
 */
export const fastSetImmediateRule = `
rule:
  pattern: nodeTimersPromises.setImmediate = patchedSetImmediatePromise;
fix: |-
  try { nodeTimersPromises.setImmediate = patchedSetImmediatePromise; } catch {}
`;
