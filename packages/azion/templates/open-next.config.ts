// default open-next.config.ts file created by @opennextjs/azion
import { defineAzionConfig } from "@opennextjs/azion/config";
import StorageIncrementalCache from "@opennextjs/azion/overrides/incremental-cache/storage-incremental-cache";
import MemoryCacheQueue from "@opennextjs/azion/overrides/queue/memory-queue";

export default defineAzionConfig({
  incrementalCache: StorageIncrementalCache,
  queue: MemoryCacheQueue,
});
