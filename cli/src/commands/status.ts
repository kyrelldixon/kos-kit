import { defineCommand } from "citty";
import { tools } from "../lib/tools";

export const statusCommand = defineCommand({
	meta: {
		name: "status",
		description: "Fast health check — show installed tool count",
	},
	async run() {
		const results = await Promise.all(
			tools.map(async (tool) => {
				try {
					const proc = Bun.spawn(["which", tool.check], { stdout: "ignore", stderr: "ignore" });
					return (await proc.exited) === 0;
				} catch {
					return false;
				}
			}),
		);

		const installed = results.filter(Boolean).length;
		const total = tools.length;
		const critical = tools.filter((t) => t.critical);
		const criticalInstalled = critical.filter((_, i) => {
			const idx = tools.indexOf(critical[i]);
			return results[idx];
		}).length;

		console.log(`kos: ${installed}/${total} tools installed (${criticalInstalled}/${critical.length} critical)`);
	},
});
