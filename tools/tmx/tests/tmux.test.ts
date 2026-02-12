import { describe, expect, test } from "bun:test";
import {
	TmuxError,
	capturePane,
	listSessions,
	newSession,
	sendKeys,
	waitForText,
	waitIdle,
} from "../src/lib/tmux";

const TEST_SOCKET = "tmx-test";
const TEST_SESSION = "tmx-test-session";

// Helper to clean up test sessions
async function killSession(name: string) {
	const proc = Bun.spawn(
		["tmux", "-L", TEST_SOCKET, "kill-session", "-t", name],
		{ stdout: "pipe", stderr: "pipe" },
	);
	await proc.exited;
}

async function killServer() {
	const proc = Bun.spawn(["tmux", "-L", TEST_SOCKET, "kill-server"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	await proc.exited;
}

describe("tmux integration", () => {
	test("listSessions returns empty when no server running", async () => {
		await killServer();
		const sessions = await listSessions({ socket: TEST_SOCKET });
		expect(sessions).toEqual([]);
	});

	test("newSession creates a detached session", async () => {
		await killServer();

		const name = await newSession({
			name: TEST_SESSION,
			socket: TEST_SOCKET,
		});
		expect(name).toBe(TEST_SESSION);

		const sessions = await listSessions({ socket: TEST_SOCKET });
		expect(sessions.length).toBe(1);
		expect(sessions[0].name).toBe(TEST_SESSION);

		await killServer();
	});

	test("newSession with dir and windowName", async () => {
		await killServer();

		const name = await newSession({
			name: TEST_SESSION,
			dir: "/tmp",
			windowName: "work",
			socket: TEST_SOCKET,
		});
		expect(name).toBe(TEST_SESSION);

		await killServer();
	});

	test("newSession throws on duplicate name", async () => {
		await killServer();

		await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });

		try {
			await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });
			expect(true).toBe(false); // Should not reach
		} catch (e) {
			expect(e).toBeInstanceOf(TmuxError);
			expect((e as TmuxError).message).toContain("duplicate session");
		}

		await killServer();
	});

	test("sendKeys and capturePane roundtrip", async () => {
		await killServer();
		await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });

		// Send echo command
		await sendKeys({
			target: TEST_SESSION,
			text: "echo HELLO_TMX",
			socket: TEST_SOCKET,
		});

		// Give shell time to process
		await Bun.sleep(500);

		const content = await capturePane({
			target: TEST_SESSION,
			lines: 50,
			socket: TEST_SOCKET,
		});

		expect(content).toContain("HELLO_TMX");

		await killServer();
	});

	test("capturePane throws on invalid target", async () => {
		await killServer();

		try {
			await capturePane({
				target: "nonexistent",
				socket: TEST_SOCKET,
			});
			expect(true).toBe(false);
		} catch (e) {
			expect(e).toBeInstanceOf(TmuxError);
		}
	});

	test("waitForText matches existing content", async () => {
		await killServer();
		await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });

		await sendKeys({
			target: TEST_SESSION,
			text: "echo MARKER_12345",
			socket: TEST_SOCKET,
		});

		const result = await waitForText({
			target: TEST_SESSION,
			pattern: "MARKER_12345",
			timeout: 5,
			interval: 0.2,
			socket: TEST_SOCKET,
		});

		expect(result.matched).toBe(true);
		expect(result.match).toContain("MARKER_12345");
		expect(result.elapsed).toBeLessThan(5);

		await killServer();
	});

	test("waitForText times out on missing pattern", async () => {
		await killServer();
		await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });

		const result = await waitForText({
			target: TEST_SESSION,
			pattern: "WILL_NEVER_APPEAR",
			timeout: 1,
			interval: 0.2,
			socket: TEST_SOCKET,
		});

		expect(result.matched).toBe(false);
		expect(result.elapsed).toBeGreaterThanOrEqual(0.9);

		await killServer();
	});

	test("sendKeys with no-enter only sends text", async () => {
		await killServer();
		await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });

		await sendKeys({
			target: TEST_SESSION,
			text: "partial text",
			enter: false,
			socket: TEST_SOCKET,
		});

		await Bun.sleep(300);

		const content = await capturePane({
			target: TEST_SESSION,
			socket: TEST_SOCKET,
		});

		// Text should be on the command line but not executed
		expect(content).toContain("partial text");

		await killServer();
	});

	test("waitIdle detects stable content", async () => {
		await killServer();
		await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });

		// Send a command and let it complete
		await sendKeys({
			target: TEST_SESSION,
			text: "echo stable_content",
			socket: TEST_SOCKET,
		});
		await Bun.sleep(500);

		const result = await waitIdle({
			target: TEST_SESSION,
			idleTime: 1,
			timeout: 5,
			interval: 0.3,
			socket: TEST_SOCKET,
		});

		expect(result.idle).toBe(true);
		expect(result.elapsed).toBeLessThan(5);
		expect(result.lastCapture).toContain("stable_content");

		await killServer();
	});

	test("waitIdle times out if content keeps changing", async () => {
		await killServer();
		await newSession({ name: TEST_SESSION, socket: TEST_SOCKET });

		// Start a command that produces continuous output
		await sendKeys({
			target: TEST_SESSION,
			text: "for i in $(seq 1 100); do echo $i; sleep 0.3; done",
			socket: TEST_SOCKET,
		});

		const result = await waitIdle({
			target: TEST_SESSION,
			idleTime: 2,
			timeout: 3,
			interval: 0.3,
			socket: TEST_SOCKET,
		});

		expect(result.idle).toBe(false);
		expect(result.elapsed).toBeGreaterThanOrEqual(2.5);

		await killServer();
	});
});
