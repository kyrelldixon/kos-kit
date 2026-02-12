import { defineCommand } from "citty";

export const updateCommand = defineCommand({
	meta: {
		name: "update",
		description: "Update kos-kit (placeholder for v2)",
	},
	run() {
		console.log("kos update is not yet implemented.");
		console.log("For now, pull the latest and re-run install.sh:");
		console.log("");
		console.log("  cd ~/.kos-kit && git pull && bash install.sh");
	},
});
