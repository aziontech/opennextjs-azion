import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import vm from "node:vm";

import { build, type BuildOptions } from "esbuild";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  getMiddlewareChunks,
  getMiddlewareShimAliases,
  middlewareUsesOg,
  nodeBuiltinsPlugin,
  QUEUE_MICROTASK_POLYFILL,
} from "./bundle-node-middleware.js";

const execFileAsync = promisify(execFile);

/**
 * Bundles `contents` with `nodeBuiltinsPlugin` installed.
 *
 * Mirrors the esbuild options `bundleNodeMiddleware` uses, as the plugin behaviour depends on
 * them: the plugin has to take over the Node.js builtins that esbuild would otherwise handle itself
 * with `platform: "node"`.
 *
 * @param contents Source of the entry point, treated as CommonJS.
 * @param options Extra esbuild options.
 * @returns The bundled output.
 */
async function bundle(contents: string, options: BuildOptions = {}): Promise<string> {
  const result = await build({
    stdin: { contents, loader: "js", resolveDir: import.meta.dirname },
    bundle: true,
    format: "esm",
    platform: "node",
    conditions: [],
    target: "es2022",
    write: false,
    logLevel: "silent",
    plugins: [nodeBuiltinsPlugin()],
    ...options,
  });
  return result.outputFiles![0]!.text;
}

/**
 * Extracts the section of the bundle holding the virtual module for `builtin`.
 *
 * @param code The bundled output.
 * @param builtin The prefixed builtin, i.e. `node:crypto`.
 * @returns The lines of the section.
 */
function getVirtualModule(code: string, builtin: string): string {
  const header = `// node-builtins:${builtin}`;
  const start = code.indexOf(header);
  expect(start, `${header} not found in:\n${code}`).toBeGreaterThanOrEqual(0);
  const next = code.indexOf("\n//", start + header.length);
  return code.slice(start, next === -1 ? undefined : next).trim();
}

/**
 * Runs `script` in a Node.js child process with the bundle importable as `BUNDLE_URL`.
 *
 * The bundle has to be evaluated out of process: Vitest resolves dynamic imports through Vite,
 * which transforms the module and applies its own `node:` interop instead of running the bundle
 * as plain ESM. That silently makes the assertions below hold whatever the plugin emits.
 *
 * @param code The bundled output.
 * @param script Body writing a JSON result to stdout, run as an ES module.
 * @returns The parsed JSON the script wrote.
 * @throws When the child process fails.
 */
async function runInNode(code: string, script: string): Promise<unknown> {
  const { stdout } = await execFileAsync(process.execPath, ["--input-type=module", "-e", script], {
    env: {
      ...process.env,
      BUNDLE_URL: `data:text/javascript,${encodeURIComponent(code)}`,
    },
  });
  return JSON.parse(stdout);
}

/**
 * Bundles and evaluates `contents`, returning what it assigns to `module.exports`.
 *
 * @param contents Source of the entry point, treated as CommonJS.
 * @returns The exported value, which has to be JSON serializable.
 */
async function bundleAndEvaluate(contents: string): Promise<unknown> {
  return runInNode(
    await bundle(contents),
    `const { default: value } = await import(process.env.BUNDLE_URL);
    process.stdout.write(JSON.stringify(value));`
  );
}

describe("nodeBuiltinsPlugin", () => {
  test("converts `require` calls into a CommonJS virtual module", async () => {
    const code = await bundle(`module.exports = require("node:crypto");`);

    expect(getVirtualModule(code, "node:crypto")).toMatchInlineSnapshot(`
      "// node-builtins:node:crypto
      import * as mod from "node:crypto";
      var require_node_crypto = __commonJS({
        "node-builtins:node:crypto"(exports, module) {
          module.exports = mod.default ?? mod;
        }
      });"
    `);

    // The virtual module must stay CommonJS: were it ESM, esbuild would wrap it with
    // `__toCommonJS` and `require` would see a copy of the named exports rather than the module.
    expect(code).not.toContain("__toCommonJS");
    expect(code).not.toContain("__esModule");
  });

  test("normalizes bare builtins to their `node:` prefixed form", async () => {
    const code = await bundle(`module.exports = require("crypto");`);

    expect(getVirtualModule(code, "node:crypto")).toContain(`import * as mod from "node:crypto";`);
    expect(code).not.toContain(`"crypto"`);
  });

  test("keeps imported builtins external", async () => {
    const code = await bundle(`import crypto from "crypto";\nexport default crypto.randomUUID;`);

    // Imports are provided by workerd, only `require` calls need the virtual module.
    expect(code).toContain(`import crypto from "node:crypto";`);
    expect(code).not.toContain("node-builtins");
  });

  test("ignores specifiers that are not builtins", async () => {
    const code = await bundle(`module.exports = require("not-a-builtin/crypto");`, {
      external: ["not-a-builtin/crypto"],
    });

    expect(code).not.toContain("node-builtins");
  });

  test("`require` returns the module itself", async () => {
    const code = await bundle(`module.exports = require("node:crypto");`);

    const result = await runInNode(
      code,
      `const { default: required } = await import(process.env.BUNDLE_URL);
      process.stdout.write(JSON.stringify({
        // The very module \`node:crypto\` provides, not a copy of its named exports:
        // a copy silently drops everything the named exports do not expose.
        isBuiltinModule: required === (await import("node:crypto")).default,
        // Node.js does not set \`__esModule\` on the result of \`require("node:crypto")\` either.
        hasEsModuleFlag: Object.hasOwn(required, "__esModule"),
      }));`
    );

    expect(result).toEqual({ isBuiltinModule: true, hasEsModuleFlag: false });
  });

  test("`require` interops with the middleware compiled by Next.js", async () => {
    // How the `import crypto from "node:crypto"` of a `proxy.ts` is compiled.
    const uuid = await bundleAndEvaluate(`
      function _interop_require_default(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }
      const crypto = _interop_require_default(require("node:crypto"));
      module.exports = crypto.default.randomUUID();
    `);

    expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("QUEUE_MICROTASK_POLYFILL", () => {
  test("defines `queueMicrotask` when the runtime does not", async () => {
    // A bare context has no `queueMicrotask`, as in the Azion runtime
    const context = vm.createContext({ globalThis: undefined as unknown, calls: [] as string[] });
    context.globalThis = context;
    expect(vm.runInContext(`typeof queueMicrotask`, context)).toBe("undefined");

    vm.runInContext(QUEUE_MICROTASK_POLYFILL, context);
    vm.runInContext(`queueMicrotask(() => calls.push("microtask")); calls.push("sync");`, context);
    await Promise.resolve();

    // The callback runs after the current synchronous code, as a microtask
    expect(context.calls).toEqual(["sync", "microtask"]);
  });

  test("keeps the `queueMicrotask` of the runtime", () => {
    const native = () => {};
    const context = vm.createContext({ globalThis: undefined as unknown, queueMicrotask: native });
    context.globalThis = context;

    vm.runInContext(QUEUE_MICROTASK_POLYFILL, context);

    expect(context.queueMicrotask).toBe(native);
  });
});

describe("getMiddlewareChunks", () => {
  let tmpDir: string;
  let serverDir: string;
  let tracePath: string;

  function write(file: string) {
    const filePath = path.join(serverDir, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "");
  }

  function trace(files: string[]) {
    fs.writeFileSync(tracePath, JSON.stringify({ version: 1, files }));
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "middleware-chunks-"));
    serverDir = path.join(tmpDir, ".next/server");
    tracePath = path.join(tmpDir, "middleware.js.nft.json");
    fs.mkdirSync(serverDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns the traced js and wasm chunks", () => {
    for (const file of ["chunks/a.js", "chunks/b.wasm", "chunks/[turbopack]_runtime.js"]) write(file);
    trace(["./chunks/a.js", "./chunks/b.wasm", "./chunks/[turbopack]_runtime.js"]);

    expect(getMiddlewareChunks(tracePath, serverDir).sort()).toEqual(
      ["chunks/[turbopack]_runtime.js", "chunks/a.js", "chunks/b.wasm"].map((file) =>
        path.join(serverDir, file).replaceAll("\\", "/")
      )
    );
  });

  test("ignores the chunks copied for another entry, i.e. the instrumentation hook", () => {
    for (const file of ["chunks/middleware.js", "chunks/instrumentation.js"]) write(file);
    trace(["./chunks/middleware.js"]);

    expect(getMiddlewareChunks(tracePath, serverDir)).toEqual([
      path.join(serverDir, "chunks/middleware.js").replaceAll("\\", "/"),
    ]);
  });

  test("ignores the traced files that are not chunks", () => {
    for (const file of [
      "chunks/a.js",
      "chunks/a.js.map",
      "middleware.js",
      "../../node_modules/pkg/index.js",
    ]) {
      write(file);
    }
    trace(["./chunks/a.js", "./chunks/a.js.map", "./middleware.js", "../../node_modules/pkg/index.js"]);

    expect(getMiddlewareChunks(tracePath, serverDir)).toHaveLength(1);
  });

  test("ignores the traced chunks that are missing in the output", () => {
    write("chunks/a.js");
    trace(["./chunks/a.js", "./chunks/missing.js"]);

    expect(getMiddlewareChunks(tracePath, serverDir)).toHaveLength(1);
  });

  test("throws when the trace can not be read", () => {
    expect(() => getMiddlewareChunks(tracePath, serverDir)).toThrow();
  });
});

describe("middlewareUsesOg", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "middleware-og-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function trace(files: string[]) {
    const tracePath = path.join(tmpDir, "middleware.js.nft.json");
    fs.writeFileSync(tracePath, JSON.stringify({ version: 1, files }));
    return tracePath;
  }

  test("is true when `@vercel/og` is traced", () => {
    expect(middlewareUsesOg(trace(["../../node_modules/next/dist/compiled/@vercel/og/index.node.js"]))).toBe(
      true
    );
  });

  test("is false when `@vercel/og` is not traced", () => {
    expect(middlewareUsesOg(trace(["../../node_modules/next/dist/compiled/next-server/app.js"]))).toBe(false);
  });
});

describe("getMiddlewareShimAliases", () => {
  const og = "next/dist/compiled/@vercel/og/index.edge.js";

  test("aliases `@vercel/og` to the throwing shim when it is not used", () => {
    expect(getMiddlewareShimAliases("/shims", false)[og]).toBe(path.join("/shims", "throw.js"));
  });

  test("does not alias `@vercel/og` when it is used", () => {
    expect(getMiddlewareShimAliases("/shims", true)).not.toHaveProperty([og]);
  });
});
