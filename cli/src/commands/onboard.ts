import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineCommand } from "citty";
import { loadConfig, saveConfig } from "../lib/config";

export const onboardCommand = defineCommand({
	meta: {
		name: "onboard",
		description: "Interactive onboarding lessons for agentic workflows",
	},
	async run() {
		// Find lessons directory (relative to kos-kit root)
		const kosDir = findKosDir();
		const lessonsDir = join(kosDir, "lessons");

		let files: string[];
		try {
			files = readdirSync(lessonsDir)
				.filter((f) => f.endsWith(".md"))
				.sort();
		} catch {
			console.error("Lessons directory not found. Is kos-kit installed?");
			process.exit(1);
		}

		if (files.length === 0) {
			console.log("No lessons found.");
			return;
		}

		const config = await loadConfig();
		const progress = config.onboard_progress ?? 0;

		if (progress >= files.length) {
			console.log("You've completed all lessons! Run with --reset to start over.");
			return;
		}

		// Show current lesson
		const file = files[progress];
		const content = readFileSync(join(lessonsDir, file), "utf-8");
		console.log(content);

		// Update progress
		config.onboard_progress = progress + 1;
		await saveConfig(config);

		console.log(`\n---`);
		console.log(`Lesson ${progress + 1} of ${files.length}. Run \`kos onboard\` for the next lesson.`);
	},
});

function findKosDir(): string {
	// Walk up from this file to find the kos-kit root (has install.sh)
	let dir = import.meta.dir;
	for (let i = 0; i < 5; i++) {
		if (Bun.file(join(dir, "install.sh")).size) {
			return dir;
		}
		dir = join(dir, "..");
	}
	// Fallback: assume ~/.kos-kit
	return join(process.env.HOME || "", ".kos-kit");
}
