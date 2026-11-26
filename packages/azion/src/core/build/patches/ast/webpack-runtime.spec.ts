/**
 * This code was originally copied and modified from the @opennextjs/cloudflare repository.
 * Significant changes have been made to adapt it for use with Azion.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { buildMultipleChunksRule, patchWebpackRuntime, singleChunkRule } from "./webpack-runtime.js";

describe("webpack runtime", () => {
  describe("multiple chunks", () => {
    test("patch runtime", () => {
      const code = `
          /******/ 		// require() chunk loading for javascript
          /******/ 		__webpack_require__.f.require = (chunkId, promises) => {
          /******/ 			// "1" is the signal for "already loaded"
          /******/ 			if (!installedChunks[chunkId]) {
          /******/ 				if (658 != chunkId) {
          /******/ 					installChunk(require("./chunks/" + __webpack_require__.u(chunkId)));
                      /******/
                  } else installedChunks[chunkId] = 1;
                  /******/
              }
              /******/
          };
      `;

      expect(patchCode(code, buildMultipleChunksRule([1, 2, 3]))).toMatchInlineSnapshot(`
        "/******/ 		// require() chunk loading for javascript
                  /******/ 		__webpack_require__.f.require = (chunkId, promises) => {
          if (!installedChunks[chunkId]) {
            switch (chunkId) {
               case 1: installChunk(require("./chunks/1.js")); break;
               case 2: installChunk(require("./chunks/2.js")); break;
               case 3: installChunk(require("./chunks/3.js")); break;
               case 658: installedChunks[chunkId] = 1; break;
               default: throw new Error(\`Unknown chunk \${chunkId}\`);
            }
          }
        }
        ;
              "
      `);
    });

    test("patch minified runtime", () => {
      const code = `
      t.f.require=(o,n)=>{e[o]||(658!=o?r(require("./chunks/"+t.u(o))):e[o]=1)}
      `;

      expect(patchCode(code, buildMultipleChunksRule([1, 2, 3]))).toMatchInlineSnapshot(
        `
        "t.f.require=(o, promises) => {
          if (!e[o]) {
            switch (o) {
               case 1: r(require("./chunks/1.js")); break;
               case 2: r(require("./chunks/2.js")); break;
               case 3: r(require("./chunks/3.js")); break;
               case 658: e[o] = 1; break;
               default: throw new Error(\`Unknown chunk \${o}\`);
            }
          }
        }

              "
      `
      );
    });
  });

  describe("single chunk", () => {
    test("patch runtime", () => {
      const code = `
/******/ 		// require() chunk loading for javascript
/******/ 		__webpack_require__.f.require = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(710 == chunkId) {
/******/ 					installChunk(require("./chunks/" + __webpack_require__.u(chunkId)));
/******/ 				} else installedChunks[chunkId] = 1;
/******/ 			}
/******/ 		};
`;

      expect(patchCode(code, singleChunkRule)).toMatchInlineSnapshot(`
        "/******/ 		// require() chunk loading for javascript
        /******/ 		__webpack_require__.f.require = (chunkId, _) => {
          if (!installedChunks[chunkId]) {
            try {
              installChunk(require("./chunks/710.js"));
            } catch {}
          }
        }
        ;
        "
      `);
    });

    test("patch minified runtime", () => {
      const code = `
      o.f.require=(t,a)=>{e[t]||(710==t?r(require("./chunks/"+o.u(t))):e[t]=1)}
      `;

      expect(patchCode(code, singleChunkRule)).toMatchInlineSnapshot(`
        "o.f.require=(t, _) => {
          if (!e[t]) {
            try {
              r(require("./chunks/710.js"));
            } catch {}
          }
        }

              "
      `);
    });
  });

  describe("patchWebpackRuntime", () => {
    const runtime = `t.f.require=(o,n)=>{e[o]||(658!=o?r(require("./chunks/"+t.u(o))):e[o]=1)}`;
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), "webpack-runtime-test-"));
      mkdirSync(join(tmpDir, "chunks"));
      writeFileSync(join(tmpDir, "webpack-runtime.js"), runtime);
      for (const chunk of ["1.js", "2.js", "other.js"]) {
        writeFileSync(join(tmpDir, "chunks", chunk), "");
      }
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    test("inlines all the numbered chunks by default", async () => {
      await patchWebpackRuntime(tmpDir);
      const patched = readFileSync(join(tmpDir, "webpack-runtime.js"), "utf-8");

      expect(patched).toContain(`case 1: r(require("./chunks/1.js"))`);
      expect(patched).toContain(`case 2: r(require("./chunks/2.js"))`);
      expect(patched).not.toContain("other.js");
    });

    test("inlines the given chunks only", async () => {
      await patchWebpackRuntime(tmpDir, ["2.js"]);
      const patched = readFileSync(join(tmpDir, "webpack-runtime.js"), "utf-8");

      expect(patched).not.toContain(`./chunks/1.js`);
      expect(patched).toContain(`case 2: r(require("./chunks/2.js"))`);
    });

    test("does not fail without a chunks directory", async () => {
      rmSync(join(tmpDir, "chunks"), { recursive: true });

      await expect(patchWebpackRuntime(tmpDir)).resolves.toBeUndefined();
    });
  });
});
