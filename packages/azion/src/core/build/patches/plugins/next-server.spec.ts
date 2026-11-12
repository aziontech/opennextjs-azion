import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import { describe, expect, test } from "vitest";

import { createComposableCacheHandlersRule } from "./next-server.js";

const rule = createComposableCacheHandlersRule(
  "/app/.open-next/server-functions/default/composable-cache.cjs"
);

describe("createComposableCacheHandlersRule", () => {
  test("patches the Next 16 `next-server.js`", () => {
    const code = `
      class NextNodeServer {
        async loadCustomCacheHandlers() {
          const { cacheMaxMemorySize, cacheHandlers } = this.nextConfig;
          if (!cacheHandlers) return;
          (0, _handlers.initializeCacheHandlers)(cacheMaxMemorySize);
          await (0, _handlers.registerCustomCacheHandlers)(async ()=>{
            for (const [kind, handler] of Object.entries(cacheHandlers)){
              (0, _handlers.setCacheHandler)(kind, await dynamicImportEsmDefault(handler));
            }
          });
        }
      }`;

    expect(patchCode(code, rule)).toMatchInlineSnapshot(`
      "class NextNodeServer {
              async loadCustomCacheHandlers() {
        const handlersMapSymbol = Symbol.for('@next/cache-handlers-map');
        const handlersSetSymbol = Symbol.for('@next/cache-handlers-set');
        globalThis[handlersMapSymbol] = new Map();
        globalThis[handlersMapSymbol].set("default", require('/app/.open-next/server-functions/default/composable-cache.cjs').default);
        globalThis[handlersMapSymbol].set("remote", require('/app/.open-next/server-functions/default/composable-cache.cjs').default);
        globalThis[handlersSetSymbol] = new Set(globalThis[handlersMapSymbol].values());
      }
            }"
    `);
  });

  test("patches the minified runtimes", () => {
    const code = `class e{async loadCustomCacheHandlers(e,t){{let{cacheMaxMemorySize:r,cacheHandlers:n}=t;if(!n)return;(0,eY.q3)(r)}}}`;

    expect(patchCode(code, rule)).toMatchInlineSnapshot(`
      "class e{async loadCustomCacheHandlers(e,t){
        const handlersMapSymbol = Symbol.for('@next/cache-handlers-map');
        const handlersSetSymbol = Symbol.for('@next/cache-handlers-set');
        globalThis[handlersMapSymbol] = new Map();
        globalThis[handlersMapSymbol].set("default", require('/app/.open-next/server-functions/default/composable-cache.cjs').default);
        globalThis[handlersMapSymbol].set("remote", require('/app/.open-next/server-functions/default/composable-cache.cjs').default);
        globalThis[handlersSetSymbol] = new Set(globalThis[handlersMapSymbol].values());
      }}"
    `);
  });

  test("patches the Next 15 `next-server.js`", () => {
    const code = `
      class NextNodeServer {
        async loadCustomCacheHandlers() {
          const { cacheHandlers } = this.nextConfig.experimental;
          if (!cacheHandlers) return;
        }
      }`;

    expect(patchCode(code, rule)).not.toContain("this.nextConfig.experimental");
  });
});
