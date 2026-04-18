import { describe, expect, test } from "bun:test";
import { kitPath, loadMise, misePath } from "./manifest";

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

  test("returns bun with its pinned version", () => {
    const entries = loadMise();
    const bun = entries.find((e) => e.name === "bun");
    expect(bun).toBeDefined();
    expect(bun?.version).toBe("1.3.12");
  });

  test("parses eza with backend override", () => {
    const entries = loadMise();
    const eza = entries.find((e) => e.name === "eza");
    expect(eza).toBeDefined();
    expect(eza?.version).toBe("0.23.4");
    expect(eza?.backend).toBe("ubi:eza-community/eza");
  });
});
