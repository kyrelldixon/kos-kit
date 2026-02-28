import { defineCommand } from "citty";
import { $ } from "bun";
import { join } from "node:path";

export const updateCommand = defineCommand({
	meta: {
		name: "update",
		description: "Pull latest kos-kit from remote",
	},
	async run() {
		const kosDir = join(process.env.HOME || "", ".kos-kit");

		console.log("Pulling latest kos-kit...");
		const pull = await $`git -C ${kosDir} pull --ff-only`.quiet();
		if (pull.exitCode !== 0) {
			console.error("Failed to pull. Check for local changes in ~/.kos-kit");
			process.exit(1);
		}
		console.log(pull.text().trim());
	},
});
