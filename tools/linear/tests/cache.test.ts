import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	findTeamByKey,
	getCachedTeams,
	loadCache,
	saveCache,
} from "../src/lib/cache";
import type { Cache, Team } from "../src/types";

const TEST_CACHE_DIR = join(homedir(), ".linear-cli-test-cache");
const TEST_CACHE_PATH = join(TEST_CACHE_DIR, "cache.json");

describe("loadCache", () => {
	beforeEach(async () => {
		await mkdir(TEST_CACHE_DIR, { recursive: true });
	});

	afterEach(async () => {
		await rm(TEST_CACHE_DIR, { recursive: true, force: true });
	});

	test("loads valid cache file", async () => {
		const cache: Cache = {
			teams: [{ id: "team-1", name: "Personal", key: "PER" }],
			synced_at: "2025-01-17T10:00:00Z",
		};
		await writeFile(TEST_CACHE_PATH, JSON.stringify(cache));

		const result = await loadCache(TEST_CACHE_PATH);

		expect(result).not.toBeNull();
		expect(result?.teams).toHaveLength(1);
		expect(result?.teams[0].key).toBe("PER");
	});

	test("returns null for missing cache file", async () => {
		const result = await loadCache("/nonexistent/cache.json");
		expect(result).toBeNull();
	});

	test("returns null for invalid cache", async () => {
		await writeFile(TEST_CACHE_PATH, JSON.stringify({ invalid: true }));

		const result = await loadCache(TEST_CACHE_PATH);
		expect(result).toBeNull();
	});
});

describe("saveCache", () => {
	beforeEach(async () => {
		await mkdir(TEST_CACHE_DIR, { recursive: true });
	});

	afterEach(async () => {
		await rm(TEST_CACHE_DIR, { recursive: true, force: true });
	});

	test("saves cache to file", async () => {
		const cache: Cache = {
			teams: [{ id: "team-1", name: "Personal", key: "PER" }],
			synced_at: "2025-01-17T10:00:00Z",
		};

		await saveCache(cache, TEST_CACHE_PATH);
		const result = await loadCache(TEST_CACHE_PATH);

		expect(result).toEqual(cache);
	});

	test("creates directory if not exists", async () => {
		const nestedPath = join(TEST_CACHE_DIR, "nested", "cache.json");
		const cache: Cache = {
			teams: [],
			synced_at: "2025-01-17T10:00:00Z",
		};

		await saveCache(cache, nestedPath);
		const result = await loadCache(nestedPath);

		expect(result).toEqual(cache);
	});
});

describe("getCachedTeams", () => {
	beforeEach(async () => {
		await mkdir(TEST_CACHE_DIR, { recursive: true });
	});

	afterEach(async () => {
		await rm(TEST_CACHE_DIR, { recursive: true, force: true });
	});

	test("returns teams from cache", async () => {
		const cache: Cache = {
			teams: [
				{ id: "team-1", name: "Personal", key: "PER" },
				{ id: "team-2", name: "Work", key: "WRK" },
			],
			synced_at: "2025-01-17T10:00:00Z",
		};
		await writeFile(TEST_CACHE_PATH, JSON.stringify(cache));

		const teams = await getCachedTeams(TEST_CACHE_PATH);

		expect(teams).toHaveLength(2);
		expect(teams[0].key).toBe("PER");
		expect(teams[1].key).toBe("WRK");
	});

	test("returns empty array if no cache", async () => {
		const teams = await getCachedTeams("/nonexistent/cache.json");
		expect(teams).toEqual([]);
	});
});

describe("findTeamByKey", () => {
	const teams: Team[] = [
		{ id: "team-1", name: "Personal", key: "PER" },
		{ id: "team-2", name: "Work", key: "WRK" },
	];

	test("finds team by exact key", () => {
		const team = findTeamByKey(teams, "PER");
		expect(team?.name).toBe("Personal");
	});

	test("finds team case-insensitively", () => {
		const team = findTeamByKey(teams, "per");
		expect(team?.name).toBe("Personal");
	});

	test("returns undefined for unknown key", () => {
		const team = findTeamByKey(teams, "UNKNOWN");
		expect(team).toBeUndefined();
	});
});
