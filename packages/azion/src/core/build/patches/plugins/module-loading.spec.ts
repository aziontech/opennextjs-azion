import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import { describe, expect, test } from "vitest";

import { moduleLoadingSignalRule } from "./module-loading.js";

describe("moduleLoadingSignalRule", () => {
  test("scopes the signal to the request", () => {
    const code = `
      let _moduleLoadingSignal;
      function getModuleLoadingSignal() {
        if (!_moduleLoadingSignal) {
          _moduleLoadingSignal = new _cachesignal.CacheSignal(null);
        }
        return _moduleLoadingSignal;
      }`;

    expect(patchCode(code, moduleLoadingSignalRule)).toMatchInlineSnapshot(`
      "let _moduleLoadingSignal;
            function getModuleLoadingSignal() {
        const requestStore = globalThis.__openNextAls?.getStore();
        if (requestStore) {
          return requestStore.moduleLoadingSignal ??= new _cachesignal.CacheSignal(null);
        }
        return _moduleLoadingSignal ??= new _cachesignal.CacheSignal(null);
      }"
    `);
  });
});
