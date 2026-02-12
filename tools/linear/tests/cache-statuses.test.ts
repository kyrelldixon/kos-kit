import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { findStatusByName, getCachedStatuses } from "../src/lib/cache";
import type { Cache, WorkflowState } from "../src/types";

const TEST_CACHE_DIR = join(homedir(), ".linear-cli-test-cache");
const TEST_CACHE_PATH = join(TEST_CACHE_DIR, "cache.json");

describe("getCachedStatuses", () => {
	beforeEach(async () => {
		await mkdir(TEST_CACHE_DIR, { recursive: true });
	});

	afterEach(async () => {
		await rm(TEST_CACHE_DIR, { recursive: true, force: true });
	});

	test("returns statuses for team", async () => {
		const cache: Cache = {
			teams: [{ id: "team-1", name: "Personal", key: "KYR" }],
			statuses: {
				KYR: [
					{ id: "s1", name: "Backlog", type: "backlog" },
					{ id: "s2", name: "Canceled", type: "canceled" },
				],
			},
			synced_at: "2026-01-18T10:00:00Z",
		};
		await writeFile(TEST_CACHE_PATH, JSON.stringify(cache));

		const statuses = await getCachedStatuses("KYR", TEST_CACHE_PATH);

		expect(statuses).toHaveLength(2);
		expect(statuses[0].name).toBe("Backlog");
	});

	test("returns empty array if no statuses for team", async () => {
		const cache: Cache = {
			teams: [{ id: "team-1", name: "Personal", key: "KYR" }],
			synced_at: "2026-01-18T10:00:00Z",
		};
		await writeFile(TEST_CACHE_PATH, JSON.stringify(cache));

		const statuses = await getCachedStatuses("KYR", TEST_CACHE_PATH);
		expect(statuses).toEqual([]);
	});

	test("returns empty array if no cache", async () => {
		const statuses = await getCachedStatuses("KYR", "/nonexistent/path.json");
		expect(statuses).toEqual([]);
	});
});

describe("findStatusByName", () => {
	const statuses: WorkflowState[] = [
		{ id: "s1", name: "Backlog", type: "backlog" },
		{ id: "s2", name: "In Progress", type: "started" },
		{ id: "s3", name: "Canceled", type: "canceled" },
	];

	test("finds status by exact name", () => {
		const status = findStatusByName(statuses, "Backlog");
		expect(status?.id).toBe("s1");
	});

	test("finds status case-insensitively", () => {
		const status = findStatusByName(statuses, "backlog");
		expect(status?.id).toBe("s1");
	});

	test("finds status with spaces", () => {
		const status = findStatusByName(statuses, "in progress");
		expect(status?.id).toBe("s2");
	});

	test("returns undefined for unknown status", () => {
		const status = findStatusByName(statuses, "Unknown");
		expect(status).toBeUndefined();
	});
});
