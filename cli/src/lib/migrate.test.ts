import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findStowSymlinks } from "./migrate";

function mkTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("findStowSymlinks", () => {
  test("returns symlinks whose target is inside kosDir/dotfiles", () => {
    const home = mkTempDir("kos-home-");
    const kos = mkTempDir("kos-dir-");
    const dotfiles = join(kos, "dotfiles");

    const zshrcSrc = join(dotfiles, "zsh", ".zshrc");
    const gitconfigSrc = join(dotfiles, "git", ".gitconfig");
    mkdirSync(join(dotfiles, "zsh"), { recursive: true });
    mkdirSync(join(dotfiles, "git"), { recursive: true });
    writeFileSync(zshrcSrc, "zsh content", { flag: "w" });
    writeFileSync(gitconfigSrc, "git content", { flag: "w" });

    symlinkSync(zshrcSrc, join(home, ".zshrc"));
    symlinkSync(gitconfigSrc, join(home, ".gitconfig"));

    writeFileSync(join(home, "unrelated-target"), "data");
    symlinkSync(join(home, "unrelated-target"), join(home, ".unrelated"));

    const result = findStowSymlinks(home, kos);
    const names = result.map((p) => p.split("/").pop()).sort();

    expect(names).toEqual([".gitconfig", ".zshrc"]);

    rmSync(home, { recursive: true, force: true });
    rmSync(kos, { recursive: true, force: true });
  });

  test("returns empty array when no symlinks are present", () => {
    const home = mkTempDir("kos-home-");
    const kos = mkTempDir("kos-dir-");
    writeFileSync(join(home, "regular-file"), "hi");

    const result = findStowSymlinks(home, kos);
    expect(result).toEqual([]);

    rmSync(home, { recursive: true, force: true });
    rmSync(kos, { recursive: true, force: true });
  });

  test("ignores symlinks whose targets are outside dotfiles/", () => {
    const home = mkTempDir("kos-home-");
    const kos = mkTempDir("kos-dir-");
    writeFileSync(join(kos, "other"), "data");
    symlinkSync(join(kos, "other"), join(home, ".other-link"));

    const result = findStowSymlinks(home, kos);
    expect(result).toEqual([]);

    rmSync(home, { recursive: true, force: true });
    rmSync(kos, { recursive: true, force: true });
  });
});
