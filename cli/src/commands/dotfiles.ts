import { join } from "node:path";
import { defineCommand } from "citty";

function kosDir(): string {
  return join(process.env.HOME ?? "", ".kos-kit");
}

function sourceFlag(): string[] {
  return ["--source", join(kosDir(), "dotfiles")];
}

async function runChezmoi(...subArgs: string[]): Promise<number> {
  const proc = Bun.spawn(["chezmoi", ...sourceFlag(), ...subArgs], {
    stdio: ["inherit", "inherit", "inherit"],
  });
  return await proc.exited;
}

const applyCmd = defineCommand({
  meta: { name: "apply", description: "chezmoi apply — write dotfiles to $HOME" },
  async run() {
    const code = await runChezmoi("apply");
    process.exit(code);
  },
});

const editCmd = defineCommand({
  meta: { name: "edit", description: "chezmoi edit <target> — edit source, apply on save" },
  args: {
    target: {
      type: "positional",
      required: true,
      description: "File to edit (e.g. ~/.zshrc)",
    },
  },
  async run({ args }) {
    const target = typeof args.target === "string" ? args.target : "";
    const code = await runChezmoi("edit", target);
    process.exit(code);
  },
});

const statusCmd = defineCommand({
  meta: { name: "status", description: "chezmoi status — show pending changes" },
  async run() {
    const code = await runChezmoi("status");
    process.exit(code);
  },
});

const diffCmd = defineCommand({
  meta: { name: "diff", description: "chezmoi diff — show unified diff" },
  async run() {
    const code = await runChezmoi("diff");
    process.exit(code);
  },
});

export const dotfilesCommand = defineCommand({
  meta: { name: "dotfiles", description: "Dotfile operations (chezmoi wrappers)" },
  subCommands: {
    apply: applyCmd,
    edit: editCmd,
    status: statusCmd,
    diff: diffCmd,
  },
});
