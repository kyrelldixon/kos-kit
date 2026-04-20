import { readdirSync, readlinkSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function pointsInto(linkPath: string, target: string, prefix: string): boolean {
  const absoluteTarget = resolve(dirname(linkPath), target);
  return absoluteTarget === prefix || absoluteTarget.startsWith(`${prefix}/`);
}

function collectSymlinksIn(dir: string, dotfilesPath: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);
    try {
      const target = readlinkSync(full);
      if (pointsInto(full, target, dotfilesPath)) {
        results.push(full);
      }
    } catch {
      // Dangling symlink or race; skip
    }
  }
  return results;
}

export function findStowSymlinks(home: string, kosDir: string): string[] {
  const dotfilesPath = join(kosDir, "dotfiles");
  const results = collectSymlinksIn(home, dotfilesPath);

  const nestedDirs = [".config", ".ssh"];
  for (const nested of nestedDirs) {
    const nestedPath = join(home, nested);
    try {
      const s = statSync(nestedPath);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }
    results.push(...collectSymlinksIn(nestedPath, dotfilesPath));
  }

  return results;
}
