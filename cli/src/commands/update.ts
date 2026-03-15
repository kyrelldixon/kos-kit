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

		// Capture current HEAD before pulling
		const oldHead = (await $`git -C ${kosDir} rev-parse HEAD`.quiet()).text().trim();

		const pull = await $`git -C ${kosDir} pull --ff-only`.quiet();
		if (pull.exitCode !== 0) {
			console.error("Failed to pull. Check for local changes in ~/.kos-kit");
			process.exit(1);
		}

		const newHead = (await $`git -C ${kosDir} rev-parse HEAD`.quiet()).text().trim();

		if (oldHead === newHead) {
			console.log("Already up to date.");
		} else {
			const log = (await $`git -C ${kosDir} log --oneline ${oldHead}..${newHead}`.quiet()).text().trim();
			console.log("kos-kit updated:\n");
			console.log(log);
		}
	},
});
