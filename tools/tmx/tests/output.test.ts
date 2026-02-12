import { describe, expect, test } from "bun:test";
import {
	formatCapture,
	formatList,
	formatSendKeys,
	formatSession,
	formatSessionCreated,
	formatWaitResult,
} from "../src/lib/output";
import type { SessionInfo, WaitForTextResult } from "../src/lib/tmux";

describe("formatSession", () => {
	test("formats attached session", () => {
		const session: SessionInfo = {
			name: "dev",
			attached: true,
			windows: 3,
			created: "2026-02-08T12:00:00.000Z",
		};
		expect(formatSession(session)).toBe(
			"dev (attached, 3 windows, created 2026-02-08T12:00:00.000Z)",
		);
	});

	test("formats detached session with 1 window", () => {
		const session: SessionInfo = {
			name: "logs",
			attached: false,
			windows: 1,
			created: "2026-02-08T12:00:00.000Z",
		};
		expect(formatSession(session)).toBe(
			"logs (detached, 1 window, created 2026-02-08T12:00:00.000Z)",
		);
	});
});

describe("formatSessionCreated", () => {
	test("formats plain text", () => {
		expect(formatSessionCreated("mytest")).toBe("Created session: mytest");
	});

	test("formats JSON", () => {
		const result = JSON.parse(formatSessionCreated("mytest", { json: true }));
		expect(result).toEqual({ session: "mytest" });
	});
});

describe("formatCapture", () => {
	test("returns content as-is for plain text", () => {
		expect(formatCapture("line1\nline2")).toBe("line1\nline2");
	});

	test("wraps in JSON", () => {
		const result = JSON.parse(formatCapture("hello", { json: true }));
		expect(result).toEqual({ content: "hello" });
	});
});

describe("formatSendKeys", () => {
	test("formats plain text", () => {
		expect(formatSendKeys("dev:0.0")).toBe("Sent keys to dev:0.0");
	});

	test("formats JSON", () => {
		const result = JSON.parse(formatSendKeys("dev:0.0", { json: true }));
		expect(result).toEqual({ target: "dev:0.0", sent: true });
	});
});

describe("formatWaitResult", () => {
	test("formats matched result", () => {
		const result: WaitForTextResult = {
			matched: true,
			match: "$ ",
			elapsed: 1.2,
			lastCapture: "some output\n$ ",
		};
		expect(formatWaitResult(result)).toBe("Matched after 1.2s: $ ");
	});

	test("formats timeout result", () => {
		const result: WaitForTextResult = {
			matched: false,
			elapsed: 15.0,
			lastCapture: "still running...",
		};
		expect(formatWaitResult(result)).toBe(
			"Timed out after 15.0s. No match found.",
		);
	});

	test("formats JSON", () => {
		const result: WaitForTextResult = {
			matched: true,
			match: "$ ",
			elapsed: 0.5,
			lastCapture: "$ ",
		};
		const parsed = JSON.parse(formatWaitResult(result, { json: true }));
		expect(parsed.matched).toBe(true);
		expect(parsed.match).toBe("$ ");
	});
});

describe("formatList", () => {
	test("formats empty list", () => {
		expect(formatList([], (x: string) => x)).toBe("No items found.");
	});

	test("formats list with formatter", () => {
		const items = ["a", "b", "c"];
		expect(formatList(items, (x) => x.toUpperCase())).toBe("A\nB\nC");
	});

	test("formats list as JSON", () => {
		const items = [1, 2, 3];
		const result = JSON.parse(formatList(items, String, { json: true }));
		expect(result).toEqual([1, 2, 3]);
	});
});
