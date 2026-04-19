import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { defineCommand } from "citty";
import {
  type KitEntry,
  type OsName,
  checkInstalled,
  loadKit,
} from "../lib/manifest";
import { findStowSymlinks } from "../lib/migrate";

interface PlannedStep {
  name: string;
  description: string;
}

interface SetupContext {
  kosDir: string;
  dryRun: boolean;
  yes: boolean;
}

function kosDir(): string {
  return join(process.env.HOME ?? "", ".kos-kit");
}

function currentOs(): OsName {
  if (process.platform === "darwin") return "darwin";
  if (process.platform === "linux") return "linux";
  throw new Error(`Unsupported platform: ${process.platform}`);
}

async function installKitEntry(entry: KitEntry): Promise<void> {
  const spec = entry.spec;
  if (!spec) return;

  let cmd: string;
  switch (spec.kind) {
    case "brew":
      cmd = `brew install ${spec.pkg}`;
      break;
    case "cask":
      cmd = `brew install --cask ${spec.pkg}`;
      break;
    case "apt":
      cmd = `sudo apt install -y ${spec.pkg}`;
      break;
    case "custom":
      if (!spec.install) {
        throw new Error(
          `kit.toml: entry "${entry.name}" kind=custom requires install command`,
        );
      }
      cmd = spec.install;
      break;
  }

  console.log(`    → installing ${entry.display}`);
  const proc = Bun.spawn(["sh", "-c", cmd], {
    stdio: ["inherit", "inherit", "inherit"],
  });
  const code = await proc.exited;
  if (code !== 0) {
    console.warn(`    ! ${entry.display} install failed (exit ${code})`);
  }
}

async function readGitConfig(key: string): Promise<string> {
  const proc = Bun.spawn(["git", "config", "--global", key], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const code = await proc.exited;
  if (code !== 0) return "";
  return (await new Response(proc.stdout).text()).trim();
}

async function maybeMigrateFromV1(ctx: SetupContext): Promise<boolean> {
  const home = process.env.HOME ?? "";
  const symlinks = findStowSymlinks(home, ctx.kosDir);
  if (symlinks.length === 0) return false;

  const chezmoiReady = existsSync(
    join(ctx.kosDir, "dotfiles", ".chezmoi.toml.tmpl"),
  );
  if (!chezmoiReady) {
    console.log(
      "\n  (migration: chezmoi source state not yet present; skipping)",
    );
    return false;
  }

  console.log(
    `\n  MIGRATION: detected ${symlinks.length} stow-managed symlinks (kos-kit v1 → v2)`,
  );
  if (!ctx.yes) {
    process.stdout.write("  Unlink and migrate? (y/N): ");
    const answer = await new Promise<string>((resolve) => {
      let data = "";
      process.stdin.setEncoding("utf-8");
      process.stdin.resume();
      process.stdin.on("data", (chunk) => {
        data += chunk;
        if (data.includes("\n")) {
          process.stdin.pause();
          resolve(data.split("\n")[0].trim());
        }
      });
    });
    if (answer.toLowerCase() !== "y") {
      console.log("  Migration declined; aborting setup.");
      process.exit(1);
    }
  }

  const backupDir = join(home, ".kos-backup", "pre-v2");
  mkdirSync(backupDir, { recursive: true });
  for (const link of symlinks) {
    const name = link.split("/").slice(-1)[0];
    const backupPath = join(backupDir, name);
    try {
      copyFileSync(link, backupPath);
    } catch {
      // If copy fails, at least still unlink
    }
    try {
      unlinkSync(link);
    } catch (err) {
      console.warn(`  ! failed to unlink ${link}: ${String(err)}`);
    }
  }
  console.log(`  Backed up to ${backupDir}; unlinked ${symlinks.length} files`);
  return true;
}

async function pickOptionalKitEntries(
  entries: KitEntry[],
): Promise<KitEntry[]> {
  const optional = entries.filter(
    (e) =>
      !e.default && (e.category === "apps" || e.category === "infrastructure"),
  );
  if (optional.length === 0) return [];

  const options = optional.map(
    (e) => `${e.name} — ${e.display} (${e.category})`,
  );
  const gumProc = Bun.spawn(
    [
      "gum",
      "choose",
      "--no-limit",
      "--header",
      "Optional tools (space to toggle, enter to confirm)",
      ...options,
    ],
    { stdout: "pipe", stderr: "inherit" },
  );
  const code = await gumProc.exited;
  if (code !== 0) return [];

  const picked = (await new Response(gumProc.stdout).text())
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split(" — ")[0]);

  return optional.filter((e) => picked.includes(e.name));
}

function ensureSymlink(target: string, linkPath: string): void {
  const parent = dirname(linkPath);
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true });

  const stat = lstatSync(linkPath, { throwIfNoEntry: false });
  if (stat) {
    if (stat.isSymbolicLink()) {
      if (readlinkSync(linkPath) === target) return;
      unlinkSync(linkPath);
    } else {
      const kind = stat.isDirectory() ? "directory" : "file";
      console.warn(
        `    ! ${linkPath} exists as a real ${kind}; skipping symlink (move it aside to let kos manage it)`,
      );
      return;
    }
  }
  symlinkSync(target, linkPath);
  console.log(`    → linked ${linkPath} → ${target}`);
}

async function runStep(
  ctx: SetupContext,
  step: PlannedStep,
  fn: () => Promise<void>,
): Promise<void> {
  console.log(`\n  ${step.name}`);
  console.log(`    ${step.description}`);
  if (ctx.dryRun) {
    console.log("    (dry-run — skipped)");
    return;
  }
  await fn();
}

export const setupCommand = defineCommand({
  meta: {
    name: "setup",
    description: "Install/update kos-kit tools and apply dotfiles",
  },
  args: {
    yes: {
      type: "boolean",
      alias: "y",
      description: "Non-interactive; install defaults without prompting",
      default: false,
    },
    "dry-run": {
      type: "boolean",
      description: "Print planned steps without executing them",
      default: false,
    },
  },
  async run({ args }) {
    const ctx: SetupContext = {
      kosDir: kosDir(),
      dryRun: args["dry-run"] === true,
      yes: args.yes === true,
    };

    console.log("kos setup");
    console.log("=========");
    if (ctx.dryRun) console.log("(dry-run mode — no changes will be made)");

    if (!ctx.dryRun) {
      await maybeMigrateFromV1(ctx);
    }

    await runStep(
      ctx,
      {
        name: "pull",
        description: "git pull --ff-only",
      },
      async () => {
        const proc = Bun.spawn(["git", "-C", ctx.kosDir, "pull", "--ff-only"], {
          stdio: ["inherit", "inherit", "inherit"],
        });
        const code = await proc.exited;
        if (code !== 0) {
          console.warn(
            "  ! git pull failed (non-fast-forward or dirty tree); continuing with local copy",
          );
        }
      },
    );

    await runStep(
      ctx,
      {
        name: "mise",
        description: "mise install (reads mise.toml + mise.lock)",
      },
      async () => {
        // Link kos-kit/mise.toml → global mise config so tools activate everywhere,
        // not just inside the repo dir.
        ensureSymlink(
          join(ctx.kosDir, "mise.toml"),
          join(process.env.HOME ?? "", ".config/mise/config.toml"),
        );

        const proc = Bun.spawn(["mise", "install"], {
          cwd: ctx.kosDir,
          stdio: ["inherit", "inherit", "inherit"],
        });
        const code = await proc.exited;
        if (code !== 0) {
          throw new Error("mise install failed");
        }
      },
    );

    await runStep(
      ctx,
      {
        name: "kit",
        description: "Install kit.toml entries (brew/apt/custom)",
      },
      async () => {
        const os = currentOs();
        const entries = loadKit(os);

        const toInstall: KitEntry[] = [];
        for (const entry of entries) {
          if (!entry.default) continue;
          const already = await checkInstalled(entry.check);
          if (!already) toInstall.push(entry);
        }

        if (!ctx.yes) {
          const picked = await pickOptionalKitEntries(entries);
          for (const entry of picked) {
            const already = await checkInstalled(entry.check);
            if (!already) toInstall.push(entry);
          }
        }

        if (toInstall.length === 0) {
          console.log("    all selected kit entries already installed");
          return;
        }

        console.log(`    ${toInstall.length} entries to install`);
        for (const entry of toInstall) {
          await installKitEntry(entry);
        }
      },
    );

    await runStep(
      ctx,
      {
        name: "link",
        description: "bun link workspace tools (tmx, transcribe, library)",
      },
      async () => {
        const tools = ["tools/tmx", "tools/transcribe", "tools/library"];

        for (const rel of tools) {
          const full = join(ctx.kosDir, rel);
          if (!existsSync(full)) {
            console.log(`    (skip) ${rel} — not present`);
            continue;
          }
          console.log(`    → linking ${rel}`);
          const proc = Bun.spawn(["bun", "link"], {
            cwd: full,
            stdio: ["inherit", "inherit", "inherit"],
          });
          const code = await proc.exited;
          if (code !== 0) {
            console.warn(`    ! bun link ${rel} failed (exit ${code})`);
          }
        }
      },
    );

    await runStep(
      ctx,
      {
        name: "dotfiles",
        description: "chezmoi init + apply (dotfiles via source state)",
      },
      async () => {
        const sourceDir = join(ctx.kosDir, "dotfiles");

        // Link kos-kit/dotfiles → chezmoi's default source path so bare
        // `chezmoi apply|edit|diff` work without needing --source.
        ensureSymlink(
          sourceDir,
          join(process.env.HOME ?? "", ".local/share/chezmoi"),
        );

        // Run init if the chezmoi config doesn't exist yet. init renders
        // .chezmoi.toml.tmpl → ~/.config/chezmoi/chezmoi.toml (seed data
        // like name/email/github/hostname).
        const chezmoiConfig = join(
          process.env.HOME ?? "",
          ".config/chezmoi/chezmoi.toml",
        );

        if (!existsSync(chezmoiConfig)) {
          const initArgs = ["chezmoi", "init"];
          if (ctx.yes) {
            const gitName = await readGitConfig("user.name");
            const gitEmail = await readGitConfig("user.email");
            if (gitName && gitEmail) {
              initArgs.push(
                "--data",
                `{"name":"${gitName}","email":"${gitEmail}","github":"${gitName}"}`,
              );
            }
          }
          const proc = Bun.spawn(initArgs, {
            stdio: ["inherit", "inherit", "inherit"],
          });
          const code = await proc.exited;
          if (code !== 0) throw new Error("chezmoi init failed");
        }

        const apply = Bun.spawn(["chezmoi", "apply"], {
          stdio: ["inherit", "inherit", "inherit"],
        });
        const applyCode = await apply.exited;
        if (applyCode !== 0) throw new Error("chezmoi apply failed");
      },
    );

    console.log("\nDone.");
  },
});
