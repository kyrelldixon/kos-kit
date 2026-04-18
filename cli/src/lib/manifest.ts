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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function loadMise(): MiseEntry[] {
  const raw = readFileSync(misePath(), "utf-8");
  const parsed: unknown = parse(raw);

  if (!isRecord(parsed)) {
    throw new Error("mise.toml: top-level must be a table");
  }

  const toolsRaw = parsed.tools;
  if (toolsRaw !== undefined && !isRecord(toolsRaw)) {
    throw new Error("mise.toml: [tools] must be a table");
  }
  const tools = toolsRaw ?? {};

  const entries: MiseEntry[] = [];
  for (const [name, value] of Object.entries(tools)) {
    if (typeof value === "string") {
      entries.push({ name, version: value });
    } else if (isRecord(value)) {
      const version =
        typeof value.version === "string" ? value.version : undefined;
      const backend =
        typeof value.backend === "string" ? value.backend : undefined;
      if (version === undefined) {
        throw new Error(
          `mise.toml: tool "${name}" object form requires a "version" field`,
        );
      }
      entries.push({ name, version, backend });
    } else {
      throw new Error(
        `mise.toml: tool "${name}" must be a string or object, got ${typeof value}`,
      );
    }
  }
  return entries;
}
