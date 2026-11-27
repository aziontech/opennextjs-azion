---
"@aziontech/opennextjs-azion": patch
---

refactor: use the runtime polyfills of `@aziontech/unenv-preset` instead of the ones in the adapter

The adapter no longer patches `Buffer.prototype.indexOf`, `setImmediate`, `process.nextTick`, `AsyncLocalStorage.snapshot()` and `AsyncLocalStorage.bind()`, `reportError` and `performance.timeOrigin` at runtime. They are applied by the `@aziontech/unenv-preset` polyfills that the Azion bundler injects. The `performance-time-origin` module is no longer compiled next to `init.js`.

**Minimum version:** the application must be built with a bundler that includes `@aziontech/unenv-preset` **1.2.0** or later. That is `@aziontech/builder` 1.0.10 or later (and the `@aziontech/bundler` release that depends on it), which the Azion CLI uses to build the application. Update the Azion CLI before (or together with) this package.

With an older bundler the polyfills are missing: pages that render on demand (SSR, and ISR revalidation) fail with `500` and `TypeError: Cannot read properties of undefined (reading 'apply')` in `patchedSetImmediate`, and ISR pages are never revalidated. Check the build with `azbundler --version` or the version of the Azion CLI.
