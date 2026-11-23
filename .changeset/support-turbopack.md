---
"@aziontech/opennextjs-azion": minor
---

feature: support Turbopack builds

Next.js 16 builds with Turbopack by default: the adapter no longer forces `--webpack` and runs the build command of the project as is. Projects that want to keep using webpack can add the flag to their build script.

- the dynamic chunk requires of the Turbopack runtime are inlined so that they are statically bundled
- the `.wasm` chunks are loaded from the files copied to the assets
- `process.env.TURBOPACK` is no longer forced to `false` for Turbopack builds
- the Node.js middleware (`proxy.ts`) is supported with both webpack and Turbopack
