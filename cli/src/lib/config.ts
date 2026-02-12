import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".kos");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export interface KosConfig {
	name?: string;
	email?: string;
	github?: string;
	onboard_progress?: number;
}

export async function loadConfig(): Promise<KosConfig> {
	const file = Bun.file(CONFIG_PATH);
	if (!(await file.exists())) return {};
	return file.json();
}

export async function saveConfig(config: KosConfig): Promise<void> {
	const { mkdir } = await import("node:fs/promises");
	await mkdir(CONFIG_DIR, { recursive: true });
	await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2));
}
