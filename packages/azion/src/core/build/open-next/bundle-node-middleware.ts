/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
/**
 * Bundles the Node.js middleware (`proxy.ts` / `middleware.ts` with the `nodejs` runtime)
 * into an Azion compatible `middleware/handler.mjs`.
 *
 * NOTE: Running Next.js Node.js middleware on the Azion runtime is experimental.
 * It re-bundles the middleware compiled by Next.js, which is an internal output
 * that can change between Next.js versions.
 *
 * `@opennextjs/aws` bundles the external middleware for a Node.js server:
 * the OpenNext config is read from the filesystem at runtime and the middleware compiled
 * by Next.js is loaded with `await import("./.next/server/middleware.js")`.
 *
 * The Azion runtime can not access the filesystem nor load modules at runtime, so the handler
 * built by `@opennextjs/aws` is replaced with a fully self-contained bundle:
 *
 * - the config manifests are inlined by `openNextEdgePlugins` (as for the edge middleware)
 * - the middleware compiled by Next.js is statically bundled from the traced files that
 *   `@opennextjs/aws` copies to `middleware/<package path>/.next/server/middleware.js`
 *
 * Both the webpack and the Turbopack runtimes are supported.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { builtinModules, isBuiltin } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type BuildOptions, getBundlerRuntime, getPackagePath } from "@opennextjs/aws/build/helper.js";
import logger from "@opennextjs/aws/logger.js";
import { ContentUpdater } from "@opennextjs/aws/plugins/content-updater.js";
import { openNextEdgePlugins } from "@opennextjs/aws/plugins/edge.js";
import { openNextExternalMiddlewarePlugin } from "@opennextjs/aws/plugins/externalMiddleware.js";
import { openNextReplacementPlugin } from "@opennextjs/aws/plugins/replacement.js";
import { openNextResolvePlugin } from "@opennextjs/aws/plugins/resolve.js";
import { getCrossPlatformPathRegex } from "@opennextjs/aws/utils/regex.js";
import { build, type Plugin } from "esbuild";

import { patchWebpackRuntime } from "../patches/ast/webpack-runtime.js";
import { setBundlerExternal } from "../patches/plugins/bundler-externals.js";
import { patchInstrumentation } from "../patches/plugins/instrumentation.js";
import { patchTurbopackRuntimeCode } from "../patches/plugins/turbopack.js";
import { normalizePath } from "../utils/normalize-path.js";

/**
 * Returns the chunks of the middleware compiled by Next.js, from its trace.
 *
 * `@opennextjs/aws` also copies to the middleware output the files traced for other entries, i.e. the
 * `instrumentation.ts` hook. Those must not be bundled: the middleware does not load the hook, the server does.
 * Bundling them also makes the build fail when they import packages that can not be resolved
 * with the conditions used for the middleware (i.e. `Could not resolve "#util"`).
 *
 * @param tracePath Path to the `.nft.json` trace of the middleware.
 * @param dotNextServerDir The `.next/server` directory of the middleware output.
 * @returns The `.js` and `.wasm` files of the trace in `.next/server/chunks`, that exist in the output.
 * @throws When the trace can not be read.
 */
export function getMiddlewareChunks(tracePath: string, dotNextServerDir: string): string[] {
  const chunksDir = normalizePath(path.join(dotNextServerDir, "chunks"));
  const { files } = JSON.parse(readFileSync(tracePath, "utf-8")) as { files: string[] };
  return files
    .map((file) => normalizePath(path.join(dotNextServerDir, file)))
    .filter((file) => file.startsWith(`${chunksDir}/`) && /\.(js|wasm)$/.test(file) && existsSync(file));
}

/**
 * Returns the aliases replacing the Next.js modules that the middleware does not use.
 *
 * @param shimsDir The directory of the shims.
 * @param usesOg Whether the middleware uses `@vercel/og`.
 * @returns The esbuild aliases.
 */
export function getMiddlewareShimAliases(shimsDir: string, usesOg: boolean): Record<string, string> {
  return {
    // When `@vercel/og` is not used, alias the edge entry to a throwing shim so that the
    // `import("next/dist/compiled/@vercel/og/index.edge.js")` emitted by the Turbopack runtime patch does not
    // drag the library (~800 KiB) and its `resvg.wasm` and `yoga.wasm` into the bundle.
    ...(usesOg ? {} : { "next/dist/compiled/@vercel/og/index.edge.js": path.join(shimsDir, "throw.js") }),
  };
}

/**
 * Returns whether the middleware uses `@vercel/og`, from its trace.
 *
 * `next/server` references the library for `ImageResponse` but Next.js only traces it
 * (`@vercel/og/index.node.js`) when the middleware imports it.
 *
 * @param tracePath Path to the `.nft.json` trace of the middleware.
 */
export function middlewareUsesOg(tracePath: string): boolean {
  const { files } = JSON.parse(readFileSync(tracePath, "utf-8")) as { files: string[] };
  return files.some((file) => normalizePath(file).endsWith("@vercel/og/index.node.js"));
}

/**
 * Inlines the chunks of the middleware compiled by Next.js.
 *
 * Both the webpack and the Turbopack runtimes resolve the chunks they need at runtime,
 * which the Azion runtime does not support. The same patches as for the server are used to inline them.
 *
 * @param options Build options.
 * @param dotNextServerDir The `.next/server` directory of the middleware output.
 * @param chunks The chunks of the middleware, see {@link getMiddlewareChunks}.
 * @throws When the Turbopack runtime can not be found.
 */
async function inlineMiddlewareChunks(
  options: BuildOptions,
  dotNextServerDir: string,
  chunks: string[]
): Promise<void> {
  const chunksDir = normalizePath(path.join(dotNextServerDir, "chunks"));

  if (getBundlerRuntime(options) !== "turbopack") {
    await patchWebpackRuntime(
      dotNextServerDir,
      chunks.filter((chunk) => chunk.endsWith(".js")).map((chunk) => chunk.slice(chunksDir.length + 1))
    );
    return;
  }

  const runtimePath = path.join(dotNextServerDir, "chunks/[turbopack]_runtime.js");
  if (!existsSync(runtimePath)) {
    throw new Error(`Turbopack runtime not found at ${runtimePath}`);
  }

  // The Turbopack runtime resolves the chunks relative to the `.next` directory.
  // `.wasm` chunks are needed too: they are loaded by `loadWasmChunk`.
  writeFileSync(
    runtimePath,
    patchTurbopackRuntimeCode({
      code: readFileSync(runtimePath, "utf-8"),
      filePath: normalizePath(runtimePath),
      tracedFiles: chunks,
      // The middleware does not load the packages that only the routes or the instrumentation use.
      onlyUsedExternals: true,
    })
  );
}

/**
 * Resolves the middleware compiled by Next.js to the copy created by `copyTracedFiles`.
 *
 * `@opennextjs/aws`'s `nodeMiddlewareHandler` loads the middleware with a dynamic
 * `await import("./.next/server/middleware.js")` that nothing on the aws side resolves (it relies
 * on the adapter bundling it), so this resolves that specifier to the traced copy.
 */
export function setCompiledMiddlewarePlugin(compiledMiddlewarePath: string): Plugin {
  return {
    name: "compiled-middleware",
    setup(build) {
      build.onResolve({ filter: getCrossPlatformPathRegex("./.next/server/middleware.js") }, () => ({
        path: compiledMiddlewarePath,
      }));
    },
  };
}

/**
 * Makes the Node.js builtins used by the bundled code (i.e. `require("crypto")` or
 * `import from "node:crypto"`) resolve to the `node:` modules provided by the runtime.
 *
 * `require` calls are converted into a virtual CommonJS module re-exporting the builtin.
 * The virtual module has to stay CommonJS - esbuild classifies it as such because it assigns to
 * `module.exports` and uses no `export` keyword - so that `require("crypto")` receives the module
 * itself rather than an esbuild `__toCommonJS` wrapper built from its named exports,
 * which would drop whatever the named exports do not expose and add a synthetic `__esModule`.
 *
 * The builtin is imported as a namespace and `mod.default ?? mod` is used rather than a default
 * import, so that a builtin without a `default` export can not fail to link.
 */
export function nodeBuiltinsPlugin(): Plugin {
  const namespace = "node-builtins";
  // Match only Node.js builtins so esbuild does not call back on every import:
  // the `node:` prefixed form and the bare names (`crypto`, `fs`, ...).
  const builtinsFilter = new RegExp(`^(node:|(${builtinModules.join("|")})$)`);
  return {
    name: namespace,
    setup(build) {
      build.onResolve({ filter: builtinsFilter }, ({ path: specifier, kind }) => {
        if (!isBuiltin(specifier)) {
          return undefined;
        }
        const prefixed = specifier.startsWith("node:") ? specifier : `node:${specifier}`;
        return kind === "require-call" ? { path: prefixed, namespace } : { path: prefixed, external: true };
      });
      build.onLoad({ filter: /^node:/, namespace }, ({ path: builtin }) => ({
        contents: `
          import * as mod from "${builtin}";
          module.exports = mod.default ?? mod;
        `,
        loader: "js",
      }));
    },
  };
}

/**
 * Defines `queueMicrotask` when the runtime does not.
 *
 * The middleware is loaded before the server, so it can not rely on the polyfill in the banner of the
 * server bundle. The React runtime vendored by Next.js (`app-page(-turbo).runtime.prod.js`), which the
 * middleware loads when it imports `next/server` or React, reads `queueMicrotask` when it is evaluated:
 * without it the load fails with `ReferenceError: queueMicrotask is not defined`.
 */
export const QUEUE_MICROTASK_POLYFILL = `if (typeof queueMicrotask === "undefined") {
  globalThis.queueMicrotask = (callback) => {
    return Promise.resolve().then(callback);
  };
}`;

/**
 * Re-bundles `middleware/handler.mjs` so that it is self-contained.
 *
 * Must run after `createMiddleware()`, which creates the output built for a Node.js server.
 *
 * @param options Build options.
 * @throws When the compiled middleware, its trace or the Turbopack runtime is missing.
 */
export async function bundleNodeMiddleware(options: BuildOptions): Promise<void> {
  const { config, outputDir } = options;

  const middlewareDir = path.join(outputDir, "middleware");
  const dotNextServerDir = path.join(middlewareDir, getPackagePath(options), ".next/server");
  const compiledMiddleware = path.join(dotNextServerDir, "middleware.js");

  if (!existsSync(compiledMiddleware)) {
    throw new Error(`Compiled Node.js middleware not found at ${compiledMiddleware}`);
  }

  // Both `middleware.ts/js` and `proxy.ts/js` emit `middleware.js` and its `.nft.json` trace.
  const tracePath = path.join(options.appBuildOutputPath, ".next/server/middleware.js.nft.json");
  if (!existsSync(tracePath)) {
    throw new Error(`Trace of the Node.js middleware not found at ${tracePath}`);
  }

  // The bundler runtime resolves the chunks of the middleware at runtime, which the Azion
  // runtime does not support. Inline the chunks so that they are statically bundled.
  await inlineMiddlewareChunks(options, dotNextServerDir, getMiddlewareChunks(tracePath, dotNextServerDir));

  // Only the trace of the middleware is checked: a server route using OG should not pull it into the middleware.
  const usesOg = middlewareUsesOg(tracePath);
  // The server bundle (and its shims) is built after the middleware, so the shims are taken from the package dist.
  const shimsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../runtime/shims");

  logger.info("Bundling Node.js middleware...");

  const middlewareConfig = config.middleware?.external ? config.middleware : undefined;
  const overrides = {
    ...middlewareConfig?.override,
    originResolver: middlewareConfig?.originResolver,
  };
  function override<T extends keyof typeof overrides>(target: T) {
    // String and lazy loaded overrides are supported, see `buildEdgeBundle`
    return typeof overrides[target] === "string" || typeof overrides[target] === "function"
      ? overrides[target]
      : undefined;
  }
  const includeCache = config.dangerous?.enableCacheInterception;

  // `next/dist/server/lib/trace/tracer.js` requires `@opentelemetry/api`, an optional
  // dependency that most apps do not install. On the edge runtime Next.js does not fall
  // back to its compiled copy when the require throws, so alias to that copy - but only
  // when the app has not installed the real package, otherwise the real one is used.
  const hasOpentelemetry = existsSync(
    path.join(options.appBuildOutputPath, "node_modules", "@opentelemetry", "api")
  );

  const updater = new ContentUpdater(options);
  const outfile = path.join(middlewareDir, "handler.mjs");

  const result = await build({
    entryPoints: [path.join(options.openNextDistDir, "adapters", "middleware.js")],
    outfile,
    metafile: true,
    allowOverwrite: true,
    bundle: true,
    format: "esm",
    target: "es2022",
    // Same resolution as the server: Next.js traced the files with the default conditions of `nft`
    // (`node`, `require`, `import` and `default`), other conditions would resolve files that
    // are not in the output (i.e. the `module` condition and field).
    // See `bundle-server.ts`.
    platform: "node",
    conditions: [],
    // Not minified here, as the server: the bundler minifies the worker, see `build.ts`.
    minify: options.minify,
    sourcemap: options.debug ? "inline" : false,
    sourcesContent: false,
    treeShaking: true,
    // Node.js builtins are handled by `nodeBuiltinsPlugin`.
    external: ["./open-next.config.mjs"],
    define: {
      // The base of the middleware compiled by Next.js is runtime agnostic. "edge" selects its
      // Web API code paths (which the Azion runtime supports) over the Node.js server paths (which it
      // does not): it also skips `setup-node-env.external.js`, which patches read-only globals.
      // Node.js builtins used by the middleware are still provided by the runtime.
      "process.env.NEXT_RUNTIME": '"edge"',
      "process.env.NODE_ENV": '"production"',
    },
    alias: {
      ...getMiddlewareShimAliases(shimsDir, usesOg),
      // See `hasOpentelemetry` above.
      ...(hasOpentelemetry ? {} : { "@opentelemetry/api": "next/dist/compiled/@opentelemetry/api" }),
    },
    plugins: [
      openNextResolvePlugin({
        overrides: {
          wrapper: override("wrapper"),
          converter: override("converter") ?? "edge",
          ...(includeCache
            ? {
                tagCache: override("tagCache"),
                incrementalCache: override("incrementalCache"),
                queue: override("queue"),
              }
            : {}),
          originResolver: override("originResolver") ?? "pattern-env",
          proxyExternalRequest: override("proxyExternalRequest") ?? "fetch",
        },
        fnName: "middleware",
      }),
      openNextReplacementPlugin({
        name: "externalMiddlewareOverrides",
        target: getCrossPlatformPathRegex("adapters/middleware.js"),
        deletes: includeCache ? [] : ["includeCacheInMiddleware"],
      }),
      // Handle the middleware with the OpenNext Node.js middleware handler
      openNextExternalMiddlewarePlugin(
        path.join(options.openNextDistDir, "core", "nodeMiddlewareHandler.js")
      ),
      setCompiledMiddlewarePlugin(compiledMiddleware),
      // `.wasm` and `.bin` files are handled by the bundler, not by this build
      setBundlerExternal(options),
      // Must be registered before `openNextEdgePlugins` to handle `require("node:*")` calls
      nodeBuiltinsPlugin(),
      // Inline the config manifests
      openNextEdgePlugins({
        nextDir: path.join(options.appBuildOutputPath, ".next"),
        isInCloudflare: true,
      }),
      // The guard Next.js uses (`process.env.NEXT_RUNTIME !== "edge"`) is inlined to `"nodejs"`
      // when Next.js compiles the middleware, so the `define` above can not eliminate the branch.
      // The module registering the hook is stubbed out instead, which matches what the edge runtime
      // does here: it has no instrumentation entry to register, and the server function - which
      // shares the worker - already registers the hook.
      patchInstrumentation(updater, options, { loadInstrumentation: false }),
      // Apply updater updates, must be the last plugin
      updater.plugin,
    ] as Plugin[],
    banner: {
      js: `
import { Buffer } from "node:buffer";
globalThis.Buffer = Buffer;

${QUEUE_MICROTASK_POLYFILL}

// Next.js' compiled middleware references \`AsyncLocalStorage\` as a global.
import { AsyncLocalStorage } from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;

// Next.js sets \`__import_unsupported\` on \`globalThis\` with \`configurable: false\`.
// When the middleware and the server share a Worker, the second call would throw,
// so it is skipped when the property is already set. Otherwise it runs as usual.
// See https://github.com/vercel/next.js/blob/5b7833e3/packages/next/src/server/web/globals.ts#L94-L98
const defaultDefineProperty = Object.defineProperty;
Object.defineProperty = function (o, p, a) {
  if (p === "__import_unsupported" && Boolean(globalThis.__import_unsupported)) {
    // \`Object.defineProperty\` returns the object it was passed.
    return o;
  }
  return defaultDefineProperty(o, p, a);
};

globalThis.openNextDebug = ${options.debug};
globalThis.openNextVersion = "${options.openNextVersion}";
globalThis.nextVersion = "${options.nextVersion}";
`,
    },
  });

  writeFileSync(`${outfile}.meta.json`, JSON.stringify(result.metafile, null, 2));
}
