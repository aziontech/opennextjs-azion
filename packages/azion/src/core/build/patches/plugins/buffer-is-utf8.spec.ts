import { patchCode } from "@opennextjs/aws/build/patch/astCodePatcher.js";
import { describe, expect, test } from "vitest";

import { isUtf8Rule } from "./buffer-is-utf8.js";

describe("isUtf8Rule", () => {
  test("patches `stream-ops.node.js`", () => {
    const code = `if ((0, _nodebuffer.isUtf8)(chunk)) { decode(chunk); }`;

    expect(patchCode(code, isUtf8Rule)).toMatchInlineSnapshot(`
      "if (((chunk) => {
        try {
          new TextDecoder("utf-8", { fatal: true }).decode(chunk);
          return true;
        } catch {
          return false;
        }
      })(chunk)) { decode(chunk); }"
    `);
  });

  test("patches the minified runtimes", () => {
    const code = `let e;if((0,s.isUtf8)(n)){let t=n.toString("utf-8")}`;

    expect(patchCode(code, isUtf8Rule)).toMatchInlineSnapshot(`
      "let e;if(((chunk) => {
        try {
          new TextDecoder("utf-8", { fatal: true }).decode(chunk);
          return true;
        } catch {
          return false;
        }
      })(n)){let t=n.toString("utf-8")}"
    `);
  });

  test("checks the encoding like `isUtf8`", () => {
    const isUtf8 = new Function("chunk", `return ${patchCode("(0, buffer.isUtf8)(chunk)", isUtf8Rule)};`);

    expect(isUtf8(new TextEncoder().encode("héllo"))).toBe(true);
    expect(isUtf8(new Uint8Array([0xc3, 0x28]))).toBe(false);
  });
});
