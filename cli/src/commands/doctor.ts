import { defineCommand } from "citty";
import { categories, toolsByCategory } from "../lib/tools";

export const doctorCommand = defineCommand({
	meta: {
		name: "doctor",
		description: "Check tool availability and report missing tools",
	},
	async run() {
		let allGood = true;

		for (const cat of categories) {
			const catTools = toolsByCategory(cat);
			console.log(`\n  ${cat.toUpperCase()}`);

			for (const tool of catTools) {
				const installed = await isInstalled(tool.check);
				const icon = installed ? "\x1b[32m+\x1b[0m" : tool.critical ? "\x1b[31mx\x1b[0m" : "\x1b[33m-\x1b[0m";
				const suffix = !installed && tool.critical ? " (critical)" : "";
				console.log(`    [${icon}] ${tool.name}${suffix}`);
				if (!installed) allGood = false;
			}
		}

		console.log("");
		if (allGood) {
			console.log("  All tools installed!");
		} else {
			console.log("  Run install.sh to install missing tools.");
		}
	},
});

async function isInstalled(cmd: string): Promise<boolean> {
	try {
		const proc = Bun.spawn(["which", cmd], { stdout: "ignore", stderr: "ignore" });
		const code = await proc.exited;
		return code === 0;
	} catch {
		return false;
	}
}
