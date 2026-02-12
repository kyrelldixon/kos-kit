import { describe, expect, test } from "bun:test";
import { categories, tools, toolsByCategory } from "../src/lib/tools";

describe("tools registry", () => {
	test("has tools defined", () => {
		expect(tools.length).toBeGreaterThan(0);
	});

	test("every tool has required fields", () => {
		for (const tool of tools) {
			expect(tool.id).toBeTruthy();
			expect(tool.name).toBeTruthy();
			expect(tool.check).toBeTruthy();
			expect(tool.category).toBeTruthy();
			expect(typeof tool.critical).toBe("boolean");
		}
	});

	test("no duplicate tool IDs", () => {
		const ids = tools.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("all tool categories are valid", () => {
		for (const tool of tools) {
			expect(categories).toContain(tool.category);
		}
	});

	test("core tools are all critical", () => {
		const coreTools = toolsByCategory("core");
		expect(coreTools.length).toBeGreaterThan(0);
		for (const tool of coreTools) {
			expect(tool.critical).toBe(true);
		}
	});

	test("toolsByCategory filters correctly", () => {
		const shell = toolsByCategory("shell");
		expect(shell.length).toBeGreaterThan(0);
		for (const tool of shell) {
			expect(tool.category).toBe("shell");
		}
	});

	test("toolsByCategory returns empty for unknown category", () => {
		const unknown = toolsByCategory("nonexistent");
		expect(unknown).toEqual([]);
	});

	test("bun is critical in languages", () => {
		const langs = toolsByCategory("languages");
		const bun = langs.find((t) => t.id === "bun");
		expect(bun).toBeDefined();
		expect(bun!.critical).toBe(true);
	});
});
