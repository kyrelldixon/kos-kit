import { readdirSync, readlinkSync, statSync } from "node:fs";
import { join } from "node:path";

export function findStowSymlinks(home: string, kosDir: string): string[] {
  const dotfilesPath = join(kosDir, "dotfiles");
  const results: string[] = [];

  const entries = readdirSync(home, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue;
    const full = join(home, entry.name);
    try {
      const target = readlinkSync(full);
      if (target.includes(dotfilesPath)) {
        results.push(full);
      }
    } catch {
      // Dangling symlink or race; skip
    }
  }

  const nestedDirs = [".config", ".ssh"];
  for (const nested of nestedDirs) {
    const nestedPath = join(home, nested);
    try {
      const s = statSync(nestedPath);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }
    const nestedEntries = readdirSync(nestedPath, { withFileTypes: true });
    for (const entry of nestedEntries) {
      if (!entry.isSymbolicLink()) continue;
      const full = join(nestedPath, entry.name);
      try {
        const target = readlinkSync(full);
        if (target.includes(dotfilesPath)) {
          results.push(full);
        }
      } catch {
        // skip
      }
    }
  }

  return results;
}
