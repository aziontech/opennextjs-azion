# Deploy Next.js apps to Azion

[OpenNext](https://opennext.js.org) is an adapter that enables the deployment of Next.js applications to Azion's developer platform.

This monorepo includes a package for adapting a Next.js application built via `next build` (in standalone mode) to run in the Azion runtime.

## Get started

To get started with OpenNext for Azion, you need to have an existing Next.js project or create a new Next.js project.

Or see the [playground-13](https://github.com/aziontech/bundler-examples/tree/main/examples/nextjs/node-playground-13) example for a simple Next.js application that uses the OpenNext for Azion package.

To build, run the following command:

```bash
pnpm add @aziontech/opennextjs-azion
```

Then, you can build your Next.js application with the following command:

```bash
pnpm exec opennextjs-azion build
```

To preview your application, you can run:

```bash
pnpm exec opennextjs-azion preview
```

## Contributing

### The repository

The repository contains two directories:

- `packages` containing a azion package that can be used to build a Azion compatible output for Next.js applications.

### How to try out the `@aziontech/opennextjs-azion` package

#### Preleases

Besides the standard npm releases we also automatically publish prerelease packages on branch pushes (using [`pkg.pr.new`](https://github.com/stackblitz-labs/pkg.pr.new)):

- `https://pkg.pr.new/@aziontech/opennextjs-azion@main`:
  Updated with every push to the `main` branch, this prerelease contains the most up to date yet (reasonably) stable version of the package.
- `https://pkg.pr.new/@aziontech/opennextjs-azion@experimental`
  Updated with every push to the `experimental` branch, this prerelease contains the latest experimental version of the package (containing features that we want to test/experiment on before committing to).

Which you can simply install directly with your package manager of choice, for example:

```bash
npm i https://pkg.pr.new/@aziontech/opennextjs-azion@main
```

### How to develop in the repository

See the [CONTRIBUTING](./CONTRIBUTING.md) page for how to get started with this repository.
