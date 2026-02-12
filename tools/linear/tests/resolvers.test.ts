import { describe, expect, test } from "bun:test";
import { parseDueDate, parsePriority } from "../src/lib/resolvers";

describe("parseDueDate", () => {
	test("today returns today's date", () => {
		const result = parseDueDate("today");
		const expected = new Date().toISOString().split("T")[0];
		expect(result).toBe(expected);
	});

	test("tomorrow returns tomorrow's date", () => {
		const result = parseDueDate("tomorrow");
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const expected = tomorrow.toISOString().split("T")[0];
		expect(result).toBe(expected);
	});

	test("YYYY-MM-DD passes through", () => {
		expect(parseDueDate("2026-03-15")).toBe("2026-03-15");
	});

	test("invalid format throws", () => {
		expect(() => parseDueDate("March 15")).toThrow();
	});
});

describe("parsePriority", () => {
	test("maps priority names to numbers", () => {
		expect(parsePriority("none")).toBe(0);
		expect(parsePriority("urgent")).toBe(1);
		expect(parsePriority("high")).toBe(2);
		expect(parsePriority("medium")).toBe(3);
		expect(parsePriority("low")).toBe(4);
	});

	test("case insensitive", () => {
		expect(parsePriority("High")).toBe(2);
		expect(parsePriority("URGENT")).toBe(1);
	});

	test("invalid priority throws", () => {
		expect(() => parsePriority("critical")).toThrow();
	});
});
