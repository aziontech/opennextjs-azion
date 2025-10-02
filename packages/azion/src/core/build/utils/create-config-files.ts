import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

import { askConfirmation } from "../../utils/ask-confirmation.js";
import { getPackageRuntimeDirPath } from "../../utils/get-package-runtime-dir-path.js";

/**
 * Creates a `open-next.config.ts` file for the user if it doesn't exist, but only after asking for the user's confirmation.
 *
 * If OPEN_NEXTJS_NO_INTERACTIVE_PROMPT environment variable is set to 'true', automatically creates the file without asking.
 *
 * If the user refuses an error is thrown (since the file is mandatory).
 *
 * @param sourceDir The source directory for the project
 */
export async function createOpenNextConfigIfNotExistent(sourceDir: string): Promise<void> {
  const openNextConfigPath = join(sourceDir, "open-next.config.ts");

  if (!existsSync(openNextConfigPath)) {
    const ciAskConfirm = process.env.OPEN_NEXTJS_NO_INTERACTIVE_PROMPT;
    let shouldCreate = true;

    if (ciAskConfirm === "true") {
      // Auto-create when OPEN_NEXTJS_NO_INTERACTIVE_PROMPT=true
      console.log(
        "Missing required `open-next.config.ts` file, creating one automatically (OPEN_NEXTJS_NO_INTERACTIVE_PROMPT=true)..."
      );
    } else {
      // Ask for confirmation (original behavior)
      shouldCreate = await askConfirmation(
        "Missing required `open-next.config.ts` file, do you want to create one?"
      );
    }

    if (!shouldCreate) {
      throw new Error("The `open-next.config.ts` file is required, aborting!");
    }

    cpSync(join(getPackageRuntimeDirPath(), "../../templates", "open-next.config.ts"), openNextConfigPath);

    console.log("✅ Created `open-next.config.ts` file successfully.");
  }
}
