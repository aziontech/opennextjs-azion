# opennextjs Release Workflow Diagram

```mermaid
graph TD
    A[Open PR to main]
    A --> B[checks.yml]
    B --> C[Prettier / Lint / TS / Tests]

    %% prerelease preview on PR
    C --> P[prereleases.yml]
    P --> Q[Build pkg-pr-new PR]

    C --> D[PR approved and merged]

    D --> G[Push to main]
    G --> H{Release workflow}
    H --> H1[prereleases.yml]
    H --> H3[changesets.yml]

    H1 --> I1[Checkout]
    I1 --> J1[Install deps]
    J1 --> K1[Build @aziontech/opennextjs-azion]
    K1 --> L1[Publish to pkg-pr-new]

    H3 --> I3[Checkout]
    I3 --> J3[Install deps]
    J3 --> K3[Build packages]
    K3 --> L3[changesets/action]
    L3 --> M3[Version PR or Publish to npm]

    %% CI nodes
    style A fill:#0d47a1,stroke:#0b3c87,stroke-width:1px,color:#ffffff
    style B fill:#1565c0,stroke:#0d47a1,stroke-width:1px,color:#ffffff
    style C fill:#1565c0,stroke:#0d47a1,stroke-width:1px,color:#ffffff
    style D fill:#1976d2,stroke:#0d47a1,stroke-width:1px,color:#ffffff

    %% routing
    style G fill:#1b5e20,stroke:#0d3a12,stroke-width:1px,color:#ffffff
    style H fill:#2e7d32,stroke:#1b5e20,stroke-width:1px,color:#ffffff

    %% prerelease job
    style H1 fill:#2e7d32,stroke:#1b5e20,stroke-width:1px,color:#ffffff
    style I1 fill:#2e7d32,stroke:#1b5e20,stroke-width:1px,color:#ffffff
    style J1 fill:#2e7d32,stroke:#1b5e20,stroke-width:1px,color:#ffffff
    style K1 fill:#2e7d32,stroke:#1b5e20,stroke-width:1px,color:#ffffff
    style L1 fill:#388e3c,stroke:#1b5e20,stroke-width:1px,color:#ffffff

    %% release job
    style H3 fill:#2e7d32,stroke:#1b5e20,stroke-width:1px,color:#ffffff
    style I3 fill:#2e7d32,stroke:#1b5e20,stroke-width:1px,color:#ffffff
    style J3 fill:#2e7d32,stroke:#1b5e20,stroke-width:1px,color:#ffffff
    style K3 fill:#2e7d32,stroke:#1b5e20,stroke-width:1px,color:#ffffff
    style L3 fill:#388e3c,stroke:#1b5e20,stroke-width:1px,color:#ffffff
    style M3 fill:#004d40,stroke:#00251a,stroke-width:1px,color:#ffffff
```

## Description

This GitHub Actions setup automates the CI and release process for the `opennextjs` package using **Checks** + **Changesets** and two release workflows: `prereleases.yml` and `changesets.yml`.

- **Trigger conditions**

  - **CI (`checks.yml`)** runs on pull requests targeting `main` and on pushes to `main`.
  - **Pre-releases (`prereleases.yml`)** run on every `push` to `main` and on `pull_request` events (PRs opened/updated against `main`), generating prerelease builds on pkg-pr-new.
  - **Stable releases (`changesets.yml`)** run on every `push` to the `main` branch to produce the official npm release.

- **Release flow (simplified)**

  - `checks.yml` runs formatting, lint, type-check and tests for each PR and push.
  - Checkout code and configure Node.js 20 in the release workflows.
  - Install dependencies and build the project (`npm run compile`).
  - Run Changesets to determine the next version, update changelogs and prepare publish.
  - **Publish the package to the npm registry** using the configured npm token.
  - **Important**: for `changesets.yml` to actually create a new release, the merged PR must include at least one Changeset file in `.changeset/*.md`.

---

- **Prerelease job (`prereleases.yml`)** (runs on `main` as prerelease flow)

  - **Checkout** the repository with full history.
  - **Install dependencies** using the shared `install-dependencies` action.
  - **Build the opennextjs package** by running `pnpm -F @aziontech/opennextjs-azion run build`.
  - **Publish a prerelease build** by running `pnpm exec pkg-pr-new publish --pnpm --compact './packages/azion'`.

- **Release job (`changesets.yml`)** (runs on every push to `main`)

  - **Checkout** the repository with full history (`fetch-depth: 0`) using a GitHub token (for example `CUSTOM_GITHUB_TOKEN`).
  - **Setup Node.js** version 20 and enable npm cache for faster installs.
  - **Install dependencies** using `npm install` or `npm ci`.
  - **Build the project** by running `npm run compile`.
  - **Run Changesets**:
    - `changeset version` reads pending `.changeset` files, decides patch/minor/major bumps, updates `package.json` and changelogs.
    - `changeset publish` publishes the new stable version to npm, authenticated with `NPM_TOKEN`, usually under the `latest` dist-tag.
