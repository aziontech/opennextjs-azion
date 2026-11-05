---
"@aziontech/opennextjs-azion": patch
---

fix: support Next.js 16.2

Every server-rendered route returned 500 with Next.js 16.2. Inline
`prefetch-hints.json` and treat the manifests Next loads with
`handleMissing` as optional, shim `require-hook` and `node-environment`
when imported by package path, let `Buffer.prototype.indexOf` accept a
`Uint8Array`, wrap the `timers/promises.setImmediate` override in a
try/catch, copy and load `yoga.wasm` for `next/og`, fetch the `next/og`
fallback font from its `file://` URL, patch the pre-16.2 Yoga
initialization whatever its minified callback name, and key the caches by
`OPEN_NEXT_BUILD_ID` so that `deploymentId` builds do not share entries.
