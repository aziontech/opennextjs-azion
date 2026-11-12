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
`OPEN_NEXT_BUILD_ID` (the `deploymentId` when set), the same ID `@opennextjs/aws`
uses for the generated cache assets folder.

Also seed the `__fetch` cache and the tag cache manifest under that same ID.
With a `deploymentId`, they used the real build ID, so the storage ended up
with two different ID folders and `revalidateTag` did not match the entries
seeded at build time.

Also make `performance.timeOrigin` follow `Date.now()` when the runtime value
is not an epoch time. Next computes the current time as
`performance.timeOrigin + performance.now()` to check whether an ISR page is
stale, so with the runtime values pages were never revalidated (the response
kept `x-nextjs-cache: HIT`) unless `revalidatePath` or `revalidateTag` was called.
