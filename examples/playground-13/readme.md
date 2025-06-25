# Next.js App Router Playground 13

Next.js recently introduced the App Router with support for:

- **Layouts:** Easily share UI while preserving state and avoiding re-renders.
- **Server Components:** Making server-first the default for the most dynamic applications.
- **Streaming:** Display instant loading states and stream in updates.
- **Suspense for Data Fetching:** `async`/`await` support and the `use` hook for component-level fetching.

The App Router can coexist with the existing `pages` directory for incremental adoption. While you **don't need to use the App Router** when upgrading to Next.js 13, we're laying the foundations to build complex interfaces while shipping less JavaScript.

## Running Locally Next.js Server

1. Install dependencies:

```sh
pnpm install
```

2. Start the dev server:

```sh
pnpm dev
```

## Documentation

https://nextjs.org/docs

## Run Example with Opennextjs Azion

You can run this example on Azion's Edge Platform by following these steps:

Preview the project locally:

To preview without generating a new Next.js build, you can use the `--skipBuild` flag:

```sh
pnpm exec opennextjs-azion preview
```
