import { describe, expect, test } from "bun:test";
import {
	execute,
	generateMarkers,
	parseOutput,
	wrapCommand,
} from "../src/lib/execute";
import { newSession } from "../src/lib/tmux";

describe("generateMarkers", () => {
	test("returns start and end markers with unique IDs", () => {
		const markers = generateMarkers();
		expect(markers.start).toMatch(/^__TMUX_EXEC_START_\d+_\d+__$/);
		expect(markers.end).toMatch(/^__TMUX_EXEC_END_\d+_\d+__$/);
	});

	test("produces different markers on successive calls", () => {
		const a = generateMarkers();
		const b = generateMarkers();
		expect(a.start).not.toBe(b.start);
		expect(a.end).not.toBe(b.end);
	});
});

describe("wrapCommand", () => {
	test("wraps command with markers and exit code capture", () => {
		const markers = { start: "__START__", end: "__END__" };
		const wrapped = wrapCommand("ls -la", markers);
		expect(wrapped).toBe("echo __START__; { ls -la; } 2>&1; echo __END__:$?");
	});

	test("handles commands with special characters", () => {
		const markers = { start: "__START__", end: "__END__" };
		const wrapped = wrapCommand('echo "hello world"', markers);
		expect(wrapped).toBe(
			'echo __START__; { echo "hello world"; } 2>&1; echo __END__:$?',
		);
	});
});

describe("parseOutput", () => {
	test("extracts output and exit code 0", () => {
		const markers = { start: "__START__", end: "__END__" };
		const captured = [
			"$ echo __START__; { echo hello; } 2>&1; echo __END__:$?",
			"__START__",
			"hello",
			"__END__:0",
			"$ ",
		].join("\n");

		const result = parseOutput(captured, markers);
		expect(result).not.toBeNull();
		expect(result?.output).toBe("hello");
		expect(result?.exitCode).toBe(0);
	});

	test("extracts non-zero exit code", () => {
		const markers = { start: "__START__", end: "__END__" };
		const captured = [
			"__START__",
			"ls: /nonexistent: No such file or directory",
			"__END__:2",
		].join("\n");

		const result = parseOutput(captured, markers);
		expect(result).not.toBeNull();
		expect(result?.exitCode).toBe(2);
	});

	test("handles multi-line output", () => {
		const markers = { start: "__START__", end: "__END__" };
		const captured = ["__START__", "line1", "line2", "line3", "__END__:0"].join(
			"\n",
		);

		const result = parseOutput(captured, markers);
		expect(result).not.toBeNull();
		expect(result?.output).toBe("line1\nline2\nline3");
	});

	test("returns null when markers not found", () => {
		const markers = { start: "__START__", end: "__END__" };
		const result = parseOutput("some random output", markers);
		expect(result).toBeNull();
	});

	test("returns null when only end marker found", () => {
		const markers = { start: "__START__", end: "__END__" };
		const result = parseOutput("__END__:0", markers);
		expect(result).toBeNull();
	});

	test("distinguishes echoed start marker from typed command", () => {
		const markers = { start: "__START_123__", end: "__END_123__" };
		const captured = [
			"$ echo __START_123__; { echo hi; } 2>&1; echo __END_123__:$?",
			"__START_123__",
			"hi",
			"__END_123__:0",
		].join("\n");

		const result = parseOutput(captured, markers);
		expect(result).not.toBeNull();
		expect(result?.output).toBe("hi");
		expect(result?.exitCode).toBe(0);
	});

	test("handles empty command output", () => {
		const markers = { start: "__START__", end: "__END__" };
		const captured = ["__START__", "__END__:0"].join("\n");

		const result = parseOutput(captured, markers);
		expect(result).not.toBeNull();
		expect(result?.output).toBe("");
		expect(result?.exitCode).toBe(0);
	});
});

const TEST_SOCKET = "tmx-test";
const TEST_SESSION = "tmx-execute-test";

async function killServer() {
	const proc = Bun.spawn(["tmux", "-L", TEST_SOCKET, "kill-server"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	await proc.exited;
}

describe("execute - integration", () => {
	test("executes simple echo command", async () => {
		await killServer();
		await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });

		const result = await execute({
			target: TEST_SESSION,
			command: "echo hello_execute",
			timeout: 10,
			socket: TEST_SOCKET,
		});

		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("hello_execute");
		expect(result.elapsed).toBeLessThan(10);

		await killServer();
	});

	test("captures non-zero exit code", async () => {
		await killServer();
		await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });

		const result = await execute({
			target: TEST_SESSION,
			command: "ls /nonexistent_path_xyz",
			timeout: 10,
			socket: TEST_SOCKET,
		});

		expect(result.exitCode).not.toBe(0);
		expect(result.output).toContain("No such file");
		expect(result.elapsed).toBeLessThan(10);

		await killServer();
	});

	test("returns exitCode -1 on timeout", async () => {
		await killServer();
		await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });

		const result = await execute({
			target: TEST_SESSION,
			command: "sleep 30",
			timeout: 2,
			socket: TEST_SOCKET,
		});

		expect(result.exitCode).toBe(-1);
		expect(result.elapsed).toBeGreaterThanOrEqual(1.5);

		await killServer();
	});

	test("handles multi-line output", async () => {
		await killServer();
		await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });

		const result = await execute({
			target: TEST_SESSION,
			command: 'printf "line1\\nline2\\nline3"',
			timeout: 10,
			socket: TEST_SOCKET,
		});

		expect(result.exitCode).toBe(0);
		expect(result.output).toContain("line1");
		expect(result.output).toContain("line2");
		expect(result.output).toContain("line3");

		await killServer();
	});
});
