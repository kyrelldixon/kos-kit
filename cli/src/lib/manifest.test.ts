import { describe, expect, test } from "bun:test";
import {
  type Category,
  MISE_BIN_OVERRIDES,
  checkInstalled,
  kitPath,
  loadKit,
  loadMise,
  miseBin,
  misePath,
} from "./manifest";

describe("manifest paths", () => {
  test("kitPath resolves to kit.toml at repo root", () => {
    expect(kitPath()).toMatch(/kit\.toml$/);
  });

  test("misePath resolves to mise.toml at repo root", () => {
    expect(misePath()).toMatch(/mise\.toml$/);
  });
});

describe("loadMise", () => {
  test("parses entries from mise.toml", () => {
    const entries = loadMise();
    expect(entries.length).toBeGreaterThan(0);
  });

  // Asserts the string form parses, not the exact pin — pins move on `mise up`.
  test("returns bun with its pinned version", () => {
    const entries = loadMise();
    const bun = entries.find((e) => e.name === "bun");
    expect(bun).toBeDefined();
    expect(bun?.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("parses eza with backend override", () => {
    const entries = loadMise();
    const eza = entries.find((e) => e.name === "eza");
    expect(eza).toBeDefined();
    expect(eza?.version).toBe("0.23.4");
    expect(eza?.backend).toBe("ubi:eza-community/eza");
  });
});

describe("miseBin", () => {
  test("returns the tool name when it matches the binary", () => {
    expect(miseBin("bun")).toBe("bun");
    expect(miseBin("fd")).toBe("fd");
  });

  test("maps ripgrep to rg", () => {
    expect(miseBin("ripgrep")).toBe("rg");
  });

  test("maps rust to cargo", () => {
    expect(miseBin("rust")).toBe("cargo");
  });

  // A stale override silently reintroduces the false negative it was added to
  // fix, so keep the map pinned to tools mise.toml actually declares.
  test("every override names a tool present in mise.toml", () => {
    const names = new Set(loadMise().map((e) => e.name));
    for (const name of Object.keys(MISE_BIN_OVERRIDES)) {
      expect(names).toContain(name);
    }
  });
});

describe("loadKit", () => {
  test("returns entries for darwin", () => {
    const entries = loadKit("darwin");
    expect(entries.length).toBeGreaterThan(0);
  });

  test("each entry has required fields", () => {
    const entries = loadKit("darwin");
    for (const e of entries) {
      expect(e.name).toBeDefined();
      expect(e.display).toBeDefined();
      expect(e.category).toBeDefined();
      expect(typeof e.default).toBe("boolean");
      expect(e.check).toBeDefined();
    }
  });

  test("defaults display to name when display is not set", () => {
    const entries = loadKit("darwin");
    const git = entries.find((e) => e.name === "git");
    expect(git?.display).toBe("git");
  });

  test("uses explicit display when set", () => {
    const entries = loadKit("darwin");
    const claude = entries.find((e) => e.name === "claude");
    expect(claude?.display).toBe("Claude Code");
  });

  test("defaults check to `command -v <name>` when not set", () => {
    const entries = loadKit("darwin");
    const git = entries.find((e) => e.name === "git");
    expect(git?.check).toBe("command -v git");
  });

  test("uses explicit check when set", () => {
    const entries = loadKit("darwin");
    const claude = entries.find((e) => e.name === "claude");
    expect(claude?.check).toBe("claude --version");
  });

  test("omits entries with no spec for the given OS", () => {
    const linux = loadKit("linux");
    expect(linux.find((e) => e.name === "ghostty")).toBeUndefined();
  });

  test("returns os-specific spec", () => {
    const macos = loadKit("darwin");
    const git = macos.find((e) => e.name === "git");
    expect(git?.spec?.kind).toBe("brew");
    expect(git?.spec?.pkg).toBe("git");

    const linux = loadKit("linux");
    const gitL = linux.find((e) => e.name === "git");
    expect(gitL?.spec?.kind).toBe("apt");
    expect(gitL?.spec?.pkg).toBe("git");
  });

  test("rejects unknown category", () => {
    const entries = loadKit("darwin");
    const valid: Category[] = [
      "core",
      "terminal",
      "shell",
      "dev",
      "apps",
      "infrastructure",
      "fun",
    ];
    for (const e of entries) {
      expect(valid.includes(e.category)).toBe(true);
    }
  });
});

describe("checkInstalled", () => {
  test("returns true for a command that exists (sh)", async () => {
    const ok = await checkInstalled("command -v sh");
    expect(ok).toBe(true);
  });

  test("returns false for a nonsense command", async () => {
    const ok = await checkInstalled(
      "command -v definitely-not-a-real-binary-xyz",
    );
    expect(ok).toBe(false);
  });

  test("returns false when the check command errors", async () => {
    const ok = await checkInstalled("false");
    expect(ok).toBe(false);
  });
});
