import type { InternalEvent, InternalResult, StreamCreator } from "@opennextjs/aws/types/open-next";
import type { Wrapper, WrapperHandler } from "@opennextjs/aws/types/overrides";

import { Writable } from "node:stream";

// Response with null body status (101, 204, 205, or 304) cannot have a body.
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

// TODO: in the future move to the open-next aws package
const handler: WrapperHandler<InternalEvent, InternalResult> =
  async (handler, converter) =>
  async (request: Request, env: Record<string, string>, ctx: any): Promise<Response> => {
    globalThis.process = process;

    // Set the environment variables
    // Cloudflare suggests to not override the process.env object but instead apply the values to it
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === "string") {
        process.env[key] = value;
      }
    }

    const internalEvent = await converter.convertFrom(request);
    const url = new URL(request.url);

    // @ts-ignore
    const { promise: promiseResponse, resolve: resolveResponse } = Promise.withResolvers<Response>();

    const streamCreator: StreamCreator = {
      writeHeaders(prelude: { statusCode: number; cookies: string[]; headers: Record<string, string> }) {
        const { statusCode, cookies, headers } = prelude;

        const responseHeaders = new Headers(headers);
        for (const cookie of cookies) {
          responseHeaders.append("Set-Cookie", cookie);
        }

        if (url.hostname === "localhost") {
          responseHeaders.set("Content-Encoding", "identity");
        }
        // @ts-ignore
        const { readable, writable } = new TransformStream({
          // @ts-ignore
          transform(chunk, controller) {
            controller.enqueue(Uint8Array.from(chunk.chunk ?? chunk));
          },
        });
        const body = NULL_BODY_STATUSES.has(statusCode) ? null : readable;
        const response = new Response(body, {
          status: statusCode,
          headers: responseHeaders,
        });
        resolveResponse(response);
        // @ts-ignore
        return Writable.fromWeb(writable);
      },
    };

    ctx.waitUntil(
      handler(internalEvent, {
        streamCreator,
        waitUntil: ctx.waitUntil.bind(ctx),
      })
    );

    return promiseResponse;
  };

export default {
  wrapper: handler,
  name: "azion-wrapper-node",
  supportStreaming: true,
  edgeRuntime: true,
} satisfies Wrapper;
