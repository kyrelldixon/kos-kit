import type { TmuxOptions } from "./tmux";
import { capturePane, sendKeys } from "./tmux";

export interface ExecuteMarkers {
	start: string;
	end: string;
}

/**
 * Generate unique start/end markers for command execution.
 * Uses PID + nanosecond timestamp to prevent collisions across concurrent calls.
 */
export function generateMarkers(): ExecuteMarkers {
	const uniqueId = `${process.pid}_${Bun.nanoseconds()}`;
	return {
		start: `__TMUX_EXEC_START_${uniqueId}__`,
		end: `__TMUX_EXEC_END_${uniqueId}__`,
	};
}

/**
 * Wrap a command with markers for exit code capture.
 *
 * Structure: echo START; { command; } 2>&1; echo END:$?
 * - Braces create command group (preserves $? for exit code)
 * - 2>&1 merges stderr into stdout
 * - $? captures exit code of the command group
 */
export function wrapCommand(command: string, markers: ExecuteMarkers): string {
	return `echo ${markers.start}; { ${command}; } 2>&1; echo ${markers.end}:$?`;
}

export interface ParsedOutput {
	output: string;
	exitCode: number;
}

/**
 * Parse captured pane output to extract command output and exit code.
 *
 * Distinguishes the ECHOED start marker (on its own line, preceded by newline)
 * from the TYPED command line that contains the marker text inline.
 * Uses regex to find the end marker with a numeric exit code (not $?).
 */
export function parseOutput(
	captured: string,
	markers: ExecuteMarkers,
): ParsedOutput | null {
	// Find ECHOED start marker (preceded by newline, on its own line)
	const newlineStart = `\n${markers.start}`;
	let startIdx = captured.indexOf(newlineStart);

	if (startIdx !== -1) {
		startIdx += 1; // skip the newline
	} else if (captured.startsWith(markers.start)) {
		startIdx = 0;
	} else {
		return null;
	}

	// Find ECHOED end marker with numeric exit code (not $?)
	const endPattern = new RegExp(`${escapeRegex(markers.end)}:(\\d+)`);
	const endMatch = endPattern.exec(captured);

	if (!endMatch) {
		return null;
	}

	const endIdx = endMatch.index;
	const exitCode = Number.parseInt(endMatch[1], 10);

	// Extract output between markers
	let outputStart = startIdx + markers.start.length;
	if (outputStart < captured.length && captured[outputStart] === "\n") {
		outputStart += 1;
	}

	const output = captured.slice(outputStart, endIdx).replace(/\n$/, "");

	return { output, exitCode };
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface ExecuteOptions extends TmuxOptions {
	target: string;
	command: string;
	/** Timeout in seconds (default: 30) */
	timeout?: number;
	/** Poll interval in seconds (default: 0.5) */
	interval?: number;
}

export interface ExecuteResult {
	/** Command stdout+stderr combined */
	output: string;
	/** Exit code (-1 on timeout) */
	exitCode: number;
	/** Time elapsed in seconds */
	elapsed: number;
}

/** Progressive expansion levels for capture-pane scrollback */
const EXPANSION_LEVELS: (number | undefined)[] = [100, 500, 2000, undefined];

/**
 * Execute a command in a tmux pane and capture output + exit code.
 *
 * Sends a marker-wrapped command, polls capture-pane with progressive
 * scrollback expansion until both markers appear, then parses the result.
 */
export async function execute(options: ExecuteOptions): Promise<ExecuteResult> {
	const timeout = options.timeout ?? 30;
	const interval = options.interval ?? 0.5;

	const markers = generateMarkers();
	const wrapped = wrapCommand(options.command, markers);

	// Send the wrapped command (literal mode ensures { } $? ; reach shell as-is)
	await sendKeys({
		target: options.target,
		text: wrapped,
		literal: true,
		socket: options.socket,
	});

	const start = Date.now();
	const deadline = start + timeout * 1000;

	while (Date.now() < deadline) {
		for (const lines of EXPANSION_LEVELS) {
			const captured = await capturePane({
				target: options.target,
				lines,
				socket: options.socket,
			});

			// Check for end marker with numeric exit code
			const hasEnd = new RegExp(`${escapeRegex(markers.end)}:\\d+`).test(
				captured,
			);

			if (hasEnd) {
				// Check for start marker
				const hasStart =
					captured.includes(`\n${markers.start}`) ||
					captured.startsWith(markers.start);

				if (hasStart) {
					const parsed = parseOutput(captured, markers);
					if (parsed) {
						return {
							output: parsed.output,
							exitCode: parsed.exitCode,
							elapsed: (Date.now() - start) / 1000,
						};
					}
				}
				// End found but start missing — try more lines
				continue;
			}
			// End not found — command still running, stop expanding
			break;
		}

		await Bun.sleep(interval * 1000);
	}

	// Timeout — try one final capture with full expansion
	for (const lines of EXPANSION_LEVELS) {
		const captured = await capturePane({
			target: options.target,
			lines,
			socket: options.socket,
		});

		const parsed = parseOutput(captured, markers);
		if (parsed) {
			return {
				output: parsed.output,
				exitCode: parsed.exitCode,
				elapsed: (Date.now() - start) / 1000,
			};
		}
	}

	return {
		output: "",
		exitCode: -1,
		elapsed: (Date.now() - start) / 1000,
	};
}
