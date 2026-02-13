import { defineCommand } from "citty";
import { $ } from "bun";
import { join } from "node:path";

export const updateCommand = defineCommand({
	meta: {
		name: "update",
		description: "Pull latest kos-kit and re-run installer",
	},
	args: {
		yes: {
			type: "boolean",
			alias: "y",
			description: "Non-interactive (install all defaults)",
			default: false,
		},
	},
	async run({ args }) {
		const kosDir = join(process.env.HOME || "", ".kos-kit");

		console.log("Pulling latest kos-kit...");
		const pull = await $`git -C ${kosDir} pull --ff-only`.quiet();
		if (pull.exitCode !== 0) {
			console.error("Failed to pull. Check for local changes in ~/.kos-kit");
			process.exit(1);
		}
		console.log(pull.text().trim());

		console.log("\nRunning installer...\n");
		const installArgs = ["bash", join(kosDir, "install.sh")];
		if (args.yes) installArgs.push("--yes");

		const install = Bun.spawn(installArgs, {
			stdio: ["inherit", "inherit", "inherit"],
		});
		const code = await install.exited;
		process.exit(code);
	},
});
