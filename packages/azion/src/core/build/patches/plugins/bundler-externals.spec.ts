import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { BuildOptions } from "@opennextjs/aws/build/helper.js";
import { build } from "esbuild";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { setBundlerExternal } from "./bundler-externals.js";

describe("setBundlerExternal", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bundler-externals-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("copies the `.wasm` file to the assets, creating the directory when it does not exist yet", async () => {
    const srcDir = path.join(tmpDir, "src");
    // Not created: it is created later by `createStaticAssets`
    const outputDir = path.join(tmpDir, ".open-next");
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, "module.wasm"), "wasm");
    fs.writeFileSync(path.join(srcDir, "entry.js"), `import wasm from "./module.wasm"; export default wasm;`);

    const result = await build({
      entryPoints: [path.join(srcDir, "entry.js")],
      bundle: true,
      format: "esm",
      write: false,
      logLevel: "silent",
      plugins: [setBundlerExternal({ outputDir } as BuildOptions)],
    });

    expect(fs.readFileSync(path.join(outputDir, "assets", "module.wasm"), "utf-8")).toBe("wasm");
    expect(result.outputFiles[0]!.text).toContain("file:///module.wasm");
  });
});
