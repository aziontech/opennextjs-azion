---
"@aziontech/opennextjs-azion": patch
---

fix: reduce the Node.js middleware (`proxy.ts`) bundle size and resolve its packages like the server

The middleware bundle no longer includes `@vercel/og` (unless the middleware imports it), the chunks and external packages used by `instrumentation.ts` or the routes, and the instrumentation registration of Next.js. This fixes `Could not resolve "#util"` (and similar) when `instrumentation.ts` imports a package with conditional imports.

The esbuild metafile is now written to `.open-next/middleware/handler.mjs.meta.json`.
