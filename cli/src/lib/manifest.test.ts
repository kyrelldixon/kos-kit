import { describe, expect, test } from "bun:test";
import { kitPath, misePath } from "./manifest";

describe("manifest paths", () => {
  test("kitPath resolves to kit.toml at repo root", () => {
    expect(kitPath()).toMatch(/kit\.toml$/);
  });

  test("misePath resolves to mise.toml at repo root", () => {
    expect(misePath()).toMatch(/mise\.toml$/);
  });
});
