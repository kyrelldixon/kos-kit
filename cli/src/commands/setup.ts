import { join } from "node:path";
import { defineCommand } from "citty";
import {
  checkInstalled,
  type KitEntry,
  loadKit,
  type OsName,
} from "../lib/manifest";

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

async function pickOptionalKitEntries(entries: KitEntry[]): Promise<KitEntry[]> {
  const optional = entries.filter(
    (e) =>
      !e.default && (e.category === "apps" || e.category === "infrastructure"),
  );
  if (optional.length === 0) return [];

  const options = optional.map((e) => `${e.name} — ${e.display} (${e.category})`);
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

    await runStep(
      ctx,
      {
        name: "pull",
        description: "git pull --ff-only",
      },
      async () => {
        const proc = Bun.spawn(
          ["git", "-C", ctx.kosDir, "pull", "--ff-only"],
          { stdio: ["inherit", "inherit", "inherit"] },
        );
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

    console.log("\nDone.");
  },
});
