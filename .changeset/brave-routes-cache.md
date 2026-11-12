---
"@aziontech/opennextjs-azion": patch
---

fix: support Next.js 16.4

- Bump `@opennextjs/aws` to 4.1.15. Next 15.5.27+ and 16.3.8+ scope the response cache keys by route
  (`/route-cache/<kind>/<hash>/$<pathname>`) and only `@opennextjs/aws` 4.1.7+ writes the build cache under
  these keys, so prerendered pages were never served from the cache.
- Inline `preview-props.json`, loaded by Next 16.4+.
- Replace `isUtf8` from `node:buffer`, which the polyfill does not implement, when Next 16.4+ inlines the RSC
  payload.
- Return a Node-like `Immediate` from `setImmediate` and run the global `process.nextTick` callbacks as
  microtasks, as expected by the `setImmediate` tracking of Next 16.4+. `setImmediate` falls back to a macrotask
  when the runtime does not define it.
- Statically wire the composable (`"use cache"`) cache handler in `loadCustomCacheHandlers` on Next 16, which reads
  the top-level `cacheHandlers` set by `@opennextjs/aws` and failed with `Module not found: "file:///.next/unused"`.
- Add the static `AsyncLocalStorage.snapshot()` and `AsyncLocalStorage.bind()` used by Next 16 when the runtime does
  not implement them.
- Define `reportError`, used by the runtime to report the errors thrown in `process.nextTick` callbacks.
- Scope the Next module-loading `CacheSignal` to the request.
- Select the experimental React runtime with the helper of the app's Next version.
- Keep the function names when bundling the server. React compares component names when resuming a partial
  prerender (Cache Components), renamed components made the resume fall back to client rendering.
- Do not crash when the tags manifest is read while it is being written, which happens with concurrent
  `"use cache"` writes.
