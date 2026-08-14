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

// mise.toml keys are tool names, which aren't always the binary that lands on
// PATH. Checking `command -v <tool name>` reports these as missing when they're
// installed and active.
export const MISE_BIN_OVERRIDES: Record<string, string> = {
  ripgrep: "rg",
  // mise's rust backend delegates to rustup and exposes no `rust` binary.
  rust: "cargo",
};

export function miseBin(name: string): string {
  return MISE_BIN_OVERRIDES[name] ?? name;
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

const VALID_CATEGORIES: readonly Category[] = [
  "core",
  "terminal",
  "shell",
  "dev",
  "apps",
  "infrastructure",
  "fun",
];

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && VALID_CATEGORIES.some((c) => c === value);
}

function parseOsSpec(raw: unknown): OsSpec | undefined {
  if (!isRecord(raw)) return undefined;
  const kind = raw.kind;
  if (
    kind !== "brew" &&
    kind !== "cask" &&
    kind !== "apt" &&
    kind !== "custom"
  ) {
    throw new Error(`kit.toml: invalid kind "${String(kind)}"`);
  }
  return {
    kind,
    pkg: typeof raw.pkg === "string" ? raw.pkg : undefined,
    install: typeof raw.install === "string" ? raw.install : undefined,
    uninstall: typeof raw.uninstall === "string" ? raw.uninstall : undefined,
  };
}

export function loadKit(os: OsName): KitEntry[] {
  const raw = readFileSync(kitPath(), "utf-8");
  const parsed: unknown = parse(raw);

  if (!isRecord(parsed)) {
    throw new Error("kit.toml: top-level must be a table");
  }

  const toolsRaw = parsed.tools;
  if (toolsRaw !== undefined && !Array.isArray(toolsRaw)) {
    throw new Error("kit.toml: [[tools]] must be an array");
  }
  const rawTools: unknown[] = toolsRaw ?? [];

  const entries: KitEntry[] = [];
  for (const r of rawTools) {
    if (!isRecord(r)) {
      throw new Error("kit.toml: entry must be a table");
    }
    if (typeof r.name !== "string") {
      throw new Error("kit.toml: entry missing required `name` field");
    }
    if (!isCategory(r.category)) {
      throw new Error(
        `kit.toml: entry "${r.name}" has invalid category "${String(r.category)}"`,
      );
    }
    if (typeof r.default !== "boolean") {
      throw new Error(
        `kit.toml: entry "${r.name}" requires boolean \`default\``,
      );
    }

    const osKey = os === "darwin" ? "macos" : "linux";
    const spec = parseOsSpec(r[osKey]);
    if (spec === undefined) continue;

    entries.push({
      name: r.name,
      display: typeof r.display === "string" ? r.display : r.name,
      category: r.category,
      default: r.default,
      check: typeof r.check === "string" ? r.check : `command -v ${r.name}`,
      spec,
    });
  }
  return entries;
}

export async function checkInstalled(cmd: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["sh", "-c", cmd], {
      stdout: "ignore",
      stderr: "ignore",
    });
    const code = await proc.exited;
    return code === 0;
  } catch {
    return false;
  }
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
