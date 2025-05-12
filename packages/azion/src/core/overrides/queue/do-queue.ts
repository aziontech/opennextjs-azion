import type { Queue, QueueMessage } from "@opennextjs/aws/types/overrides";
// import { IgnorableError } from "@opennextjs/aws/utils/error.js";

// import { getAzionContext } from "../../azion-context";

export default {
  name: "do-queue",
  send: async (_msg: QueueMessage) => {
    // const durableObject = getAzionContext().env.NEXT_CACHE_DO_QUEUE;
    // if (!durableObject) throw new IgnorableError("No durable object binding for cache revalidation");
    // const id = durableObject.idFromName(msg.MessageGroupId);
    // const stub = durableObject.get(id);
    // await stub.revalidate({
    //   ...msg,
    // });
  },
} satisfies Queue;
