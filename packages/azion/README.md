# OpenNext for Azion

Deploy Next.js apps to Azion!

> **Warning**  
> This will be available when the package is integrated into the openenextjs organization .

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
  ```

- Preview the app in Azion

  ```bash
  npx opennextjs-azion preview
  # or
  pnpm opennextjs-azion preview
  # or
  yarn opennextjs-azion preview
  ```

## Deploy your app

Deploy your application to production with the following:

- build the app and adapt it for Azion

  ```bash
  npx opennextjs-azion deploy
  # or
  pnpm opennextjs-azion deploy
  # or
  yarn opennextjs-azion deploy
  ```

  > **Note**  
  > The `opennextjs-azion deploy` command will generate a new Next.js build and prepare your application for deployment on Azion.  
  > To deploy to Azion, you need an Azion account and must use the Azion CLI. See the [Azion CLI Documentation](https://www.azion.com/en/documentation/products/azion-cli/overview/) for more information on how to set up your account and use the CLI.
