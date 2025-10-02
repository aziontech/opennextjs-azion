# OpenNext for Azion

Deploy Next.js apps to Azion!

[OpenNext](https://opennext.js.org) is an adapter that enables the deployment of Next.js applications to Azion's developer platform.

## Get started

To get started with OpenNext for Azion, you need to have an existing Next.js project or create a new Next.js project.

Or see the [playground-13](https://github.com/aziontech/bundler-examples/tree/main/examples/nextjs/node-playground-13) example for a simple Next.js application that uses the OpenNext for Azion package.

To build, run the following command:

```bash
pnpm add @aziontech/opennextjs-azion
```

## Local development

- you can use the regular `next` CLI to start the Next.js dev server:

## Local preview

Run the following commands to preview the production build of your application locally:

- build the app and adapt it for Azion

  ```bash
  npx opennextjs-azion build
  # or
  pnpm opennextjs-azion build
  # or
  yarn opennextjs-azion build
  ```

- Preview the app in Azion

  ```bash
  npx opennextjs-azion preview
  # or
  pnpm opennextjs-azion preview
  # or
  yarn opennextjs-azion preview
  ```

#### Deploy by CLI

To deploy to Azion, you need an Azion account and must use the Azion CLI. See the [Azion CLI Documentation](https://www.azion.com/en/documentation/products/azion-cli/overview/) for more information on how to set up your account and use the CLI.

To deploy your application to Azion using the Azion CLI, follow these steps:

1. Link your project:

   ```bash
   azion link
   ```

2. Build your application:

   ```bash
   azion build --preset opennextjs
   ```

3. Preview your application:

   ```bash
   azion dev --port 3000 --skip-framework-build
   ```

   This will start a local server to preview your application.

4. Deploy your application:

   ```bash
   azion deploy --skip-build --local
   ```

## Environment Variables

The following environment variables can be used to customize the behavior of OpenNext for Azion:

### `OPEN_NEXTJS_NO_INTERACTIVE_PROMPT`

Controls whether interactive prompts are shown during the build process.

- **Default**: `undefined` (prompts are shown)
- **Values**:
  - `"true"`: Automatically creates required configuration files without prompting
  - Any other value or unset: Shows interactive prompts (default behavior)

**Usage in CI/CD environments:**

```bash
# Automatically create config files without user interaction
OPEN_NEXTJS_NO_INTERACTIVE_PROMPT=true azion build --preset opennextjs
```

**Or add to your `.env` file:**

```env
OPEN_NEXTJS_NO_INTERACTIVE_PROMPT=true
```

This is particularly useful for remote builds, CI/CD pipelines, and automated deployments where user interaction is not possible.

### `NEXT_PRIVATE_DEBUG_CACHE`

Enables detailed cache debugging logs for troubleshooting cache-related issues.

- **Default**: `undefined` (no debug logs)
- **Values**:
  - `"true"`: Enables detailed cache operation logs
  - Any other value or unset: Normal logging (default behavior)

**Usage for debugging:**

```bash
# Enable cache debugging
NEXT_PRIVATE_DEBUG_CACHE=true azion build --preset opennextjs
```

**Or add to your `.env` file:**

```env
NEXT_PRIVATE_DEBUG_CACHE=true
```

This will show detailed information about cache operations, including cache keys, storage operations, and any cache-related errors.
