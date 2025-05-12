# OpenNext for Azion

Deploy Next.js apps to Azion!

[OpenNext for Azion](https://opennext.js.org/azion) is a Azion specific adapter that enables deployment of Next.js applications to Azion.

## Get started

To get started with the adapter visit the [official get started documentation](https://opennext.js.org/azion/get-started).

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
  # or
  bun opennextjs-azion build
  ```

- Preview the app in Wrangler

  ```bash
  npx edge-functions dev
  # or
  pnpm edge-functions dev
  # or
  yarn edge-functions dev
  ```

## Deploy your app

Deploy your application to production with the following:

- build the app and adapt it for Azion

  ```bash
  npx opennextjs-azion build && npx opennextjs-azion deploy
  # or
  pnpm opennextjs-azion build && pnpm opennextjs-azion deploy
  # or
  yarn opennextjs-azion build && yarn opennextjs-azion deploy
  ```
