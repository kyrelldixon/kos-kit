import { defineCommand } from "citty";
import { formatWaitResult } from "../lib/output";
import { waitForText } from "../lib/tmux";

export const waitForTextCommand = defineCommand({
	meta: {
		name: "wait-for-text",
		description: "Wait for a regex pattern to appear in a tmux pane",
	},
	args: {
		target: {
			type: "positional",
			description: "Target pane (session:window.pane)",
			required: true,
		},
		pattern: {
			type: "positional",
			description: "Regex pattern to match",
			required: true,
		},
		timeout: {
			type: "string",
			alias: "t",
			description: "Timeout in seconds (default: 15)",
		},
		interval: {
			type: "string",
			alias: "i",
			description: "Poll interval in seconds (default: 0.5)",
		},
		lines: {
			type: "string",
			alias: "S",
			description: "Scrollback lines to inspect (default: 1000)",
		},
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
		socket: {
			type: "string",
			description: "tmux socket name (-L)",
		},
	},
	async run({ args }) {
		const timeout = args.timeout ? Number.parseFloat(args.timeout) : undefined;
		const interval = args.interval
			? Number.parseFloat(args.interval)
			: undefined;
		const lines = args.lines ? Number.parseInt(args.lines, 10) : undefined;

		const result = await waitForText({
			target: args.target,
			pattern: args.pattern,
			timeout,
			interval,
			lines,
			socket: args.socket,
		});

		console.log(formatWaitResult(result, { json: args.json }));

		if (!result.matched) {
			process.exit(1);
		}
	},
});
