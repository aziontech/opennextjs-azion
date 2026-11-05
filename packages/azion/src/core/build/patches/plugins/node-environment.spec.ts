import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import { describe, expect, test } from "vitest";

import { fastSetImmediateRule } from "./node-environment.js";

describe("fastSetImmediateRule", () => {
  test("wraps the timers/promises override in a try/catch", () => {
    const code = `
      function install() {
        globalThis.setImmediate = patchedSetImmediate;
        nodeTimers.setImmediate = patchedSetImmediate;
        nodeTimersPromises.setImmediate = patchedSetImmediatePromise;
      }`;

    expect(patchCode(code, fastSetImmediateRule)).toMatchInlineSnapshot(`
      "function install() {
              globalThis.setImmediate = patchedSetImmediate;
              nodeTimers.setImmediate = patchedSetImmediate;
              try { nodeTimersPromises.setImmediate = patchedSetImmediatePromise; } catch {}
            }"
    `);
  });
});
