import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadConfig, loadEnv } from "../src/lib/config";

const TEST_CONFIG_DIR = join(homedir(), ".linear-cli-test");
const TEST_CONFIG_PATH = join(TEST_CONFIG_DIR, "config.json");
const TEST_ENV_PATH = join(TEST_CONFIG_DIR, ".env");

describe("loadConfig", () => {
	beforeEach(async () => {
		await mkdir(TEST_CONFIG_DIR, { recursive: true });
	});

	afterEach(async () => {
		await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
	});

	test("loads valid config file", async () => {
		const config = {
			default_team: "personal",
			env_file: "~/projects/kyrell-os/.env",
		};
		await writeFile(TEST_CONFIG_PATH, JSON.stringify(config));

		const result = await loadConfig(TEST_CONFIG_PATH);

		expect(result.default_team).toBe("personal");
		expect(result.env_file).toBe("~/projects/kyrell-os/.env");
	});

	test("throws on missing config file", async () => {
		await expect(loadConfig("/nonexistent/config.json")).rejects.toThrow(
			"Config file not found",
		);
	});

	test("throws on invalid config", async () => {
		await writeFile(TEST_CONFIG_PATH, JSON.stringify({ invalid: true }));

		await expect(loadConfig(TEST_CONFIG_PATH)).rejects.toThrow();
	});
});

describe("loadEnv", () => {
	beforeEach(async () => {
		await mkdir(TEST_CONFIG_DIR, { recursive: true });
	});

	afterEach(async () => {
		await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
	});

	test("loads LINEAR_API_KEY from env file", async () => {
		await writeFile(TEST_ENV_PATH, "LINEAR_API_KEY=lin_test_123\n");

		const env = await loadEnv(TEST_ENV_PATH);

		expect(env.LINEAR_API_KEY).toBe("lin_test_123");
	});

	test("throws if LINEAR_API_KEY missing", async () => {
		await writeFile(TEST_ENV_PATH, "OTHER_VAR=value\n");

		await expect(loadEnv(TEST_ENV_PATH)).rejects.toThrow(
			"LINEAR_API_KEY not found",
		);
	});

	test("throws if env file missing", async () => {
		await expect(loadEnv("/nonexistent/.env")).rejects.toThrow();
	});
});
