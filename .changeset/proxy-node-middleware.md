---
"@aziontech/opennextjs-azion": patch
---

feature: support Node.js middleware (`proxy.ts`)

Next.js 16 replaces `middleware.ts` with `proxy.ts`, which always runs on the Node.js runtime.

The Node.js middleware is now bundled into a self-contained `middleware/handler.mjs`: the OpenNext config manifests are inlined at build time (as for the edge middleware) and the middleware compiled by Next.js is statically bundled instead of being loaded from the filesystem at runtime.

The support is experimental.
