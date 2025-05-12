const config = {
  default: {
    override: {
      wrapper: "cloudflare-node", // TODO: create a wrapper for Azion on repository @opennextjs/aws
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: async () => {}, // TODO: create a cache for Azion
      tagCache: "dummy",
      queue: "dummy",
    },
  },
  edgeExternals: ["node:crypto"],
};

export default config;
