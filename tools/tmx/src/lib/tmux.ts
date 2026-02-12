export interface TmuxResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export interface TmuxOptions {
	/** Socket name (-L flag) */
	socket?: string;
}

/**
 * Run a tmux command and return stdout, stderr, and exit code.
 */
export async function runTmux(
	args: string[],
	options: TmuxOptions = {},
): Promise<TmuxResult> {
	const cmd = ["tmux"];

	if (options.socket) {
		cmd.push("-L", options.socket);
	}

	cmd.push(...args);

	const proc = Bun.spawn(cmd, {
		stdout: "pipe",
		stderr: "pipe",
	});

	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);

	const exitCode = await proc.exited;

	return { stdout: stdout.trimEnd(), stderr: stderr.trimEnd(), exitCode };
}

/**
 * Run a tmux command, throwing on non-zero exit code.
 */
export async function tmux(
	args: string[],
	options: TmuxOptions = {},
): Promise<string> {
	const result = await runTmux(args, options);

	if (result.exitCode !== 0) {
		const msg = result.stderr || `tmux exited with code ${result.exitCode}`;
		throw new TmuxError(msg, result);
	}

	return result.stdout;
}

export class TmuxError extends Error {
	result: TmuxResult;

	constructor(message: string, result: TmuxResult) {
		super(message);
		this.name = "TmuxError";
		this.result = result;
	}
}

export interface SessionInfo {
	name: string;
	attached: boolean;
	windows: number;
	created: string;
}

/**
 * Parse tmux list-sessions output into structured data.
 * Uses -F format string for reliable parsing.
 */
export async function listSessions(
	options: TmuxOptions = {},
): Promise<SessionInfo[]> {
	const sep = "|";
	const format = [
		"#{session_name}",
		"#{session_attached}",
		"#{session_windows}",
		"#{session_created}",
	].join(sep);
	const result = await runTmux(["list-sessions", "-F", format], options);

	if (result.exitCode !== 0) {
		// "no server running" or "no sessions" — not an error, just empty
		if (
			result.stderr.includes("no server running") ||
			result.stderr.includes("no sessions") ||
			result.stderr.includes("error connecting")
		) {
			return [];
		}
		throw new TmuxError(result.stderr, result);
	}

	if (!result.stdout) return [];

	return result.stdout.split("\n").map((line) => {
		const [name, attached, windows, epoch] = line.split(sep);
		const created = new Date(Number.parseInt(epoch, 10) * 1000).toISOString();
		return {
			name,
			attached: attached === "1",
			windows: Number.parseInt(windows, 10),
			created,
		};
	});
}

export interface NewSessionOptions extends TmuxOptions {
	name: string;
	/** Starting directory */
	dir?: string;
	/** Window name */
	windowName?: string;
}

/**
 * Create a new detached tmux session.
 */
export async function newSession(options: NewSessionOptions): Promise<string> {
	const args = [
		"new-session",
		"-d",
		"-s",
		options.name,
		"-P",
		"-F",
		"#{session_name}",
	];

	if (options.windowName) {
		args.push("-n", options.windowName);
	}

	if (options.dir) {
		args.push("-c", options.dir);
	}

	return tmux(args, options);
}

export interface SendKeysOptions extends TmuxOptions {
	target: string;
	text: string;
	/** Send Enter after text (default: true) */
	enter?: boolean;
	/** Delay in seconds between text and Enter (default: 0.1) */
	delay?: number;
	/** Literal text mode — sends text as-is, not as key names (default: true) */
	literal?: boolean;
}

/**
 * Send keys to a tmux pane with baked-in timing fix.
 *
 * The timing problem: when text + Enter are sent together, the shell may not
 * have processed the text buffer before Enter arrives, causing silent failures.
 *
 * Fix: send text first, wait, then send Enter separately.
 */
export async function sendKeys(options: SendKeysOptions): Promise<void> {
	const enter = options.enter ?? true;
	const delay = options.delay ?? 0.1;
	const literal = options.literal ?? true;

	const textArgs = ["send-keys", "-t", options.target];
	if (literal) {
		textArgs.push("-l");
	}
	textArgs.push("--", options.text);

	await tmux(textArgs, options);

	if (enter) {
		await Bun.sleep(delay * 1000);
		await tmux(["send-keys", "-t", options.target, "Enter"], options);
	}
}

export interface CapturePaneOptions extends TmuxOptions {
	target: string;
	/** Number of scrollback lines to capture (negative start index) */
	lines?: number;
	/** Join wrapped lines (-J flag) */
	join?: boolean;
}

/**
 * Capture the contents of a tmux pane.
 */
export async function capturePane(
	options: CapturePaneOptions,
): Promise<string> {
	const args = ["capture-pane", "-p", "-t", options.target];

	if (options.join !== false) {
		args.push("-J");
	}

	if (options.lines) {
		args.push("-S", `-${options.lines}`);
	}

	return tmux(args, options);
}

export interface WaitForTextOptions extends TmuxOptions {
	target: string;
	/** Regex pattern to match */
	pattern: string;
	/** Timeout in seconds (default: 15) */
	timeout?: number;
	/** Poll interval in seconds (default: 0.5) */
	interval?: number;
	/** Scrollback lines to inspect (default: 1000) */
	lines?: number;
}

export interface WaitForTextResult {
	matched: boolean;
	/** The line that matched */
	match?: string;
	/** Time elapsed in seconds */
	elapsed: number;
	/** Last captured pane content (useful for debugging on timeout) */
	lastCapture: string;
}

/**
 * Poll a tmux pane until a regex pattern matches or timeout.
 */
export async function waitForText(
	options: WaitForTextOptions,
): Promise<WaitForTextResult> {
	const timeout = options.timeout ?? 15;
	const interval = options.interval ?? 0.5;
	const lines = options.lines ?? 1000;

	const regex = new RegExp(options.pattern);
	const start = Date.now();
	const deadline = start + timeout * 1000;

	let lastCapture = "";

	while (Date.now() < deadline) {
		lastCapture = await capturePane({
			target: options.target,
			lines,
			socket: options.socket,
		});

		for (const line of lastCapture.split("\n")) {
			if (regex.test(line)) {
				return {
					matched: true,
					match: line,
					elapsed: (Date.now() - start) / 1000,
					lastCapture,
				};
			}
		}

		await Bun.sleep(interval * 1000);
	}

	return {
		matched: false,
		elapsed: (Date.now() - start) / 1000,
		lastCapture,
	};
}

export interface WaitIdleOptions extends TmuxOptions {
	target: string;
	/** How long content must be stable to declare idle, in seconds (default: 2) */
	idleTime?: number;
	/** Timeout in seconds (default: 30) */
	timeout?: number;
	/** Poll interval in seconds (default: 0.5) */
	interval?: number;
	/** Scrollback lines to capture (default: 1000) */
	lines?: number;
}

export interface WaitIdleResult {
	/** True if pane became idle */
	idle: boolean;
	/** Time elapsed in seconds */
	elapsed: number;
	/** Last captured pane content */
	lastCapture: string;
}

/**
 * Wait until a tmux pane's content stops changing.
 *
 * Hashes pane content on each poll. When the hash remains unchanged
 * for `idleTime` seconds, the pane is considered idle. Useful when
 * you don't know what the shell prompt looks like.
 */
export async function waitIdle(
	options: WaitIdleOptions,
): Promise<WaitIdleResult> {
	const idleTime = options.idleTime ?? 2;
	const timeout = options.timeout ?? 30;
	const interval = options.interval ?? 0.5;
	const lines = options.lines ?? 1000;

	const start = Date.now();
	const deadline = start + timeout * 1000;

	let lastHash: number | bigint = 0;
	let lastChangedAt = Date.now();
	let lastCapture = "";

	while (Date.now() < deadline) {
		lastCapture = await capturePane({
			target: options.target,
			lines,
			socket: options.socket,
		});

		const hash = Bun.hash(lastCapture);

		if (hash !== lastHash) {
			lastHash = hash;
			lastChangedAt = Date.now();
		} else if (Date.now() - lastChangedAt >= idleTime * 1000) {
			return {
				idle: true,
				elapsed: (Date.now() - start) / 1000,
				lastCapture,
			};
		}

		await Bun.sleep(interval * 1000);
	}

	return {
		idle: false,
		elapsed: (Date.now() - start) / 1000,
		lastCapture,
	};
}
