import { homedir } from "node:os";
import { join } from "node:path";
import { defineCommand } from "citty";
import { saveConfig } from "../lib/config";

export const authCommand = defineCommand({
	meta: {
		name: "auth",
		description: "Set up Linear CLI authentication",
	},
	async run() {
		const configDir = join(homedir(), ".linear-cli");
		const configPath = join(configDir, "config.json");
		const envPath = "~/.env.linear";
		const envExpandedPath = join(homedir(), ".env.linear");

		console.log("Linear CLI Setup");
		console.log("================\n");

		// Prompt for API key
		console.log("1. Go to: https://linear.app/settings/api");
		console.log('2. Create a personal API key (label: "linear-cli")\n');

		process.stdout.write("Paste your API key: ");
		const apiKey = (await readLine()).trim();

		if (!apiKey) {
			console.error("No API key provided. Aborting.");
			process.exit(1);
		}

		// Write env file
		await Bun.write(envExpandedPath, `LINEAR_API_KEY=${apiKey}\n`);
		console.log(`\nWrote API key to ${envExpandedPath}`);

		// Prompt for default team key (optional)
		process.stdout.write("Default team key (e.g. KYR, or press Enter to skip): ");
		const teamKey = (await readLine()).trim();

		// Write config
		const config = {
			default_team: teamKey || "",
			env_file: envPath,
		};
		await saveConfig(config, configPath);
		console.log(`Wrote config to ${configPath}`);

		console.log("\nDone! Run `linear sync` to fetch teams and statuses.");
	},
});

function readLine(): Promise<string> {
	return new Promise((resolve) => {
		let data = "";
		process.stdin.setEncoding("utf-8");
		process.stdin.resume();
		process.stdin.on("data", (chunk) => {
			data += chunk;
			if (data.includes("\n")) {
				process.stdin.pause();
				resolve(data.split("\n")[0]);
			}
		});
	});
}
