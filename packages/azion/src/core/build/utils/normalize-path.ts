/**
 * Converts a path to its POSIX form (`/` separators), whatever the platform.
 *
 * Backslashes are always replaced: paths coming from Windows tooling (i.e. `readlink`) can be
 * processed on any platform.
 */
export function normalizePath(path: string) {
  return path.replaceAll("\\", "/");
}
