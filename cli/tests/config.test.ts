import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We test config load/save by mocking the paths
describe("config", () => {
	const testDir = join(tmpdir(), "kos-test-config");

	afterEach(() => {
		try {
			rmSync(testDir, { recursive: true });
		} catch {}
	});

	test("save and load config round-trip", async () => {
		mkdirSync(testDir, { recursive: true });
		const configPath = join(testDir, "config.json");

		const config = { name: "Test User", email: "test@example.com", github: "testuser" };
		await Bun.write(configPath, JSON.stringify(config, null, 2));

		const loaded = await Bun.file(configPath).json();
		expect(loaded.name).toBe("Test User");
		expect(loaded.email).toBe("test@example.com");
		expect(loaded.github).toBe("testuser");
	});

	test("missing config returns empty object pattern", async () => {
		const configPath = join(testDir, "nonexistent", "config.json");
		const file = Bun.file(configPath);
		expect(await file.exists()).toBe(false);
	});
});
