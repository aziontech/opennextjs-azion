import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

import { getPackageRuntimeDirPath } from "../../utils/get-package-runtime-dir-path.js";
import { askConfirmation } from "../../utils/ask-confirmation.js";

/**
 * Creates a `open-next.config.ts` file for the user if it doesn't exist, but only after asking for the user's confirmation.
 *
 * If the user refuses an error is thrown (since the file is mandatory).
 *
 * @param sourceDir The source directory for the project
 */
export async function createOpenNextConfigIfNotExistent(sourceDir: string): Promise<void> {
  const openNextConfigPath = join(sourceDir, "open-next.config.ts");

  if (!existsSync(openNextConfigPath)) {
    const answer = await askConfirmation(
      "Missing required `open-next.config.ts` file, do you want to create one?"
    );

    if (!answer) {
      throw new Error("The `open-next.config.ts` file is required, aborting!");
    }

    cpSync(join(getPackageRuntimeDirPath(), "../../templates", "open-next.config.ts"), openNextConfigPath);
  }
}
