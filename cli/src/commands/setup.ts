import { join } from "node:path";
import { defineCommand } from "citty";

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

    console.log("\nDone.");
  },
});
