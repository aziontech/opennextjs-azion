# Deploy Next.js apps to Azion

[OpenNext for Azion](https://opennext.js.org/azion) is an adapter that enables the deployment of Next.js applications to Azion's developer platform.

This monorepo includes a package for adapting a Next.js application built via `next build` (in standalone mode) to run in the Azion workerd runtime using the [LINK TO MATRIX COMPATIBILITY TABLE].

## Get started

Visit the [OpenNext docs](https://opennext.js.org/azion/get-started) for instructions on starting a new project, or migrating an existing one.

## Contributing

### The repository

The repository contains two directories:

- `packages` containing a azion package that can be used to build a Azion Workers-compatible output for Next.js applications.
- `examples` containing Next.js applications that use the above mentioned azion package.

### How to try out the `@opennextjs/azion` package

You can simply install the package from npm as specified in the [OpenNext documentation](https://opennext.js.org/azion/get-started).

#### Preleases

Besides the standard npm releases we also automatically publish prerelease packages on branch pushes (using [`pkg.pr.new`](https://github.com/stackblitz-labs/pkg.pr.new)):

- `https://pkg.pr.new/@opennextjs/azion@main`:
  Updated with every push to the `main` branch, this prerelease contains the most up to date yet (reasonably) stable version of the package.
- `https://pkg.pr.new/@opennextjs/azion@experimental`
  Updated with every push to the `experimental` branch, this prerelease contains the latest experimental version of the package (containing features that we want to test/experiment on before committing to).

Which you can simply install directly with your package manager of choice, for example:

```bash
npm i https://pkg.pr.new/@opennextjs/azion@main
```

### How to develop in the repository

See the [CONTRIBUTING](./CONTRIBUTING.md) page for how to get started with this repository.
