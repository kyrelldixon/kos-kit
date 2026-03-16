import { homedir } from "node:os";
import { join } from "node:path";
import { defineCommand } from "citty";
import { loadConfig, saveConfig } from "../lib/config";

export const setupCommand = defineCommand({
  meta: {
    name: "setup",
    description: "Configure name, email, and GitHub username",
  },
  async run() {
    console.log("kos setup");
    console.log("=========\n");

    const config = await loadConfig();

    const name = await prompt("Name", config.name);
    const email = await prompt("Email", config.email);
    const github = await prompt("GitHub username", config.github);

    // Save to kos config
    config.name = name;
    config.email = email;
    config.github = github;
    await saveConfig(config);
    // Auto-detect API URL
    console.log("\nDetecting kos-agent API...");
    let apiUrl = "https://kos.kyrelldixon.com";
    try {
      const res = await fetch("http://localhost:9080/health", {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        apiUrl = "http://localhost:9080";
        console.log("Found local kos-agent at localhost:9080");
      }
    } catch {
      console.log(
        "No local kos-agent — using remote: https://kos.kyrelldixon.com",
      );
    }
    config.api_url = apiUrl;
    await saveConfig(config);
    console.log("Saved to ~/.kos/config.json");

    // Write .gitconfig.local
    const gitconfigLocal = join(homedir(), ".gitconfig.local");
    const gitconfig = `[user]\n\tname = ${name}\n\temail = ${email}\n`;
    await Bun.write(gitconfigLocal, gitconfig);
    console.log(`Wrote ${gitconfigLocal}`);

    console.log("\nDone!");
  },
});

async function prompt(label: string, defaultVal?: string): Promise<string> {
  const suffix = defaultVal ? ` [${defaultVal}]` : "";
  process.stdout.write(`${label}${suffix}: `);

  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.resume();
    process.stdin.on("data", (chunk) => {
      data += chunk;
      if (data.includes("\n")) {
        process.stdin.pause();
        const val = data.split("\n")[0].trim();
        resolve(val || defaultVal || "");
      }
    });
  });
}
