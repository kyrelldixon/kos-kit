import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
	type Cache,
	CacheSchema,
	type Team,
	type WorkflowState,
} from "../types";

const DEFAULT_CACHE_PATH = join(homedir(), ".linear-cli", "cache.json");

export async function loadCache(
	cachePath: string = DEFAULT_CACHE_PATH,
): Promise<Cache | null> {
	try {
		const content = await readFile(cachePath, "utf-8");
		const parsed = JSON.parse(content);
		return CacheSchema.parse(parsed);
	} catch {
		return null;
	}
}

export async function saveCache(
	cache: Cache,
	cachePath: string = DEFAULT_CACHE_PATH,
): Promise<void> {
	await mkdir(dirname(cachePath), { recursive: true });
	await writeFile(cachePath, JSON.stringify(cache, null, 2));
}

export async function getCachedTeams(
	cachePath: string = DEFAULT_CACHE_PATH,
): Promise<Team[]> {
	const cache = await loadCache(cachePath);
	return cache?.teams ?? [];
}

export function findTeamByKey(teams: Team[], key: string): Team | undefined {
	return teams.find((t) => t.key.toLowerCase() === key.toLowerCase());
}

export async function getCachedStatuses(
	teamKey: string,
	cachePath: string = DEFAULT_CACHE_PATH,
): Promise<WorkflowState[]> {
	const cache = await loadCache(cachePath);
	return cache?.statuses?.[teamKey.toUpperCase()] ?? [];
}

export function findStatusByName(
	statuses: WorkflowState[],
	name: string,
): WorkflowState | undefined {
	return statuses.find((s) => s.name.toLowerCase() === name.toLowerCase());
}
