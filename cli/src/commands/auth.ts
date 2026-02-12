import { defineCommand } from "citty";

export const authCommand = defineCommand({
	meta: {
		name: "auth",
		description: "Authenticate GitHub CLI, Linear CLI, and Claude Code",
	},
	async run() {
		console.log("kos auth");
		console.log("========\n");

		await runAuth("GitHub CLI", "gh", ["auth", "login"]);
		await runAuth("Linear CLI", "linear", ["auth"]);
		await runAuth("Claude Code", "claude", ["login"]);
	},
});

async function runAuth(name: string, cmd: string, args: string[]) {
	// Check if command exists
	try {
		const which = Bun.spawn(["which", cmd], { stdout: "ignore", stderr: "ignore" });
		if ((await which.exited) !== 0) {
			console.log(`  [!] ${name}: ${cmd} not found, skipping`);
			return;
		}
	} catch {
		console.log(`  [!] ${name}: ${cmd} not found, skipping`);
		return;
	}

	console.log(`  [>] ${name}`);
	const proc = Bun.spawn([cmd, ...args], {
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	const code = await proc.exited;
	if (code === 0) {
		console.log(`  [+] ${name} authenticated\n`);
	} else {
		console.log(`  [!] ${name} auth exited with code ${code}\n`);
	}
}
