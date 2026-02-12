import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { type Config, ConfigSchema } from "../types";

const DEFAULT_CONFIG_PATH = join(homedir(), ".linear-cli", "config.json");

export async function loadConfig(
	configPath: string = DEFAULT_CONFIG_PATH,
): Promise<Config> {
	let content: string;
	try {
		content = await readFile(configPath, "utf-8");
	} catch {
		throw new Error(`Config file not found: ${configPath}`);
	}

	const parsed = JSON.parse(content);
	return ConfigSchema.parse(parsed);
}

export async function saveConfig(
	config: Config,
	configPath: string = DEFAULT_CONFIG_PATH,
): Promise<void> {
	await mkdir(dirname(configPath), { recursive: true });
	await writeFile(configPath, JSON.stringify(config, null, 2));
}

export function expandPath(path: string): string {
	if (path.startsWith("~/")) {
		return join(homedir(), path.slice(2));
	}
	return path;
}

export interface Env {
	LINEAR_API_KEY: string;
}

export async function loadEnv(envPath: string): Promise<Env> {
	const expandedPath = expandPath(envPath);
	let content: string;
	try {
		content = await readFile(expandedPath, "utf-8");
	} catch {
		throw new Error(`Env file not found: ${expandedPath}`);
	}

	const env: Record<string, string> = {};
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const [key, ...valueParts] = trimmed.split("=");
		if (key && valueParts.length > 0) {
			env[key] = valueParts.join("=");
		}
	}

	if (!env.LINEAR_API_KEY) {
		throw new Error("LINEAR_API_KEY not found in env file");
	}

	return { LINEAR_API_KEY: env.LINEAR_API_KEY };
}
