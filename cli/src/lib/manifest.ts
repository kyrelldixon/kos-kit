import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "smol-toml";

export type Category =
  | "core"
  | "terminal"
  | "shell"
  | "dev"
  | "apps"
  | "infrastructure"
  | "fun";

export type OsName = "darwin" | "linux";

export type InstallKind = "brew" | "cask" | "apt" | "custom";

export interface OsSpec {
  kind: InstallKind;
  pkg?: string;
  install?: string;
  uninstall?: string;
}

export interface KitEntry {
  name: string;
  display: string;
  category: Category;
  default: boolean;
  check: string;
  spec: OsSpec | undefined;
}

export interface MiseEntry {
  name: string;
  version: string;
  backend?: string;
}

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

export function kitPath(): string {
  return join(REPO_ROOT, "kit.toml");
}

export function misePath(): string {
  return join(REPO_ROOT, "mise.toml");
}
