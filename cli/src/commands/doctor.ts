import { defineCommand } from "citty";
import {
  type Category,
  type KitEntry,
  type MiseEntry,
  checkInstalled,
  loadKit,
  loadMise,
} from "../lib/manifest";

function currentOs(): "darwin" | "linux" {
  if (process.platform === "darwin") return "darwin";
  if (process.platform === "linux") return "linux";
  throw new Error(`Unsupported platform: ${process.platform}`);
}

function icon(ok: boolean): string {
  return ok ? "\x1b[32m+\x1b[0m" : "\x1b[33m-\x1b[0m";
}

export const doctorCommand = defineCommand({
  meta: {
    name: "doctor",
    description: "Check tool availability across mise.toml and kit.toml",
  },
  async run() {
    const os = currentOs();
    const kit: KitEntry[] = loadKit(os);
    const mise: MiseEntry[] = loadMise();

    let allGood = true;

    console.log("\n  MISE TOOLS");
    for (const m of mise) {
      const installed = await checkInstalled(`command -v ${m.name}`);
      console.log(`    [${icon(installed)}] ${m.name}@${m.version}`);
      if (!installed) allGood = false;
    }

    const categories: Category[] = [
      "core",
      "terminal",
      "shell",
      "dev",
      "apps",
      "infrastructure",
      "fun",
    ];
    for (const cat of categories) {
      const catEntries = kit.filter((e) => e.category === cat);
      if (catEntries.length === 0) continue;

      console.log(`\n  ${cat.toUpperCase()}`);
      for (const entry of catEntries) {
        const installed = await checkInstalled(entry.check);
        console.log(`    [${icon(installed)}] ${entry.display}`);
        if (!installed && entry.default) allGood = false;
      }
    }

    const brewAvailable =
      os === "darwin" && (await checkInstalled("command -v brew"));
    if (brewAvailable) {
      const dupes: { name: string; brewVer: string; miseVer: string }[] = [];
      for (const m of mise) {
        const brewProc = Bun.spawn(
          ["brew", "list", "--formula", "--versions", m.name],
          { stdout: "pipe", stderr: "ignore" },
        );
        const exit = await brewProc.exited;
        if (exit !== 0) continue;
        const brewText = (await new Response(brewProc.stdout).text()).trim();
        if (!brewText) continue;
        const brewVer = brewText.split(" ")[1] ?? "?";
        dupes.push({ name: m.name, brewVer, miseVer: m.version });
      }

      if (dupes.length > 0) {
        console.log("\n  DUPLICATES (mise + brew):");
        for (const d of dupes) {
          console.log(
            `    ${d.name}  brew: ${d.brewVer}  mise: ${d.miseVer} [active]`,
          );
        }
        console.log(
          `\n  Remove brew versions with:\n    brew uninstall ${dupes.map((d) => d.name).join(" ")}`,
        );
      }
    }

    console.log("");
    if (allGood) {
      console.log("  All default tools installed.");
    } else {
      console.log("  Run: kos setup");
    }
  },
});
