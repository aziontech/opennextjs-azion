---
"@aziontech/opennextjs-azion": patch
---

refactor: use the runtime polyfills of `@aziontech/unenv-preset` instead of the ones in the adapter

The adapter no longer patches `Buffer.prototype.indexOf`, `setImmediate`, `process.nextTick`, `AsyncLocalStorage.snapshot()` and `AsyncLocalStorage.bind()`, `reportError` and `performance.timeOrigin` at runtime. They are applied by the `@aziontech/unenv-preset` polyfills that the Azion bundler injects, so the Azion CLI (`@aziontech/builder`) used to build the application must include a version of `@aziontech/unenv-preset` that has them. The `performance-time-origin` module is no longer compiled next to `init.js`.
