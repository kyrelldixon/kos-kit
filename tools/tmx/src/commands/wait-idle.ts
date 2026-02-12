import { defineCommand } from "citty";
import { formatWaitIdle } from "../lib/output";
import { waitIdle } from "../lib/tmux";

export const waitIdleCommand = defineCommand({
	meta: {
		name: "wait-idle",
		description: "Wait for pane content to become stable (idle)",
	},
	args: {
		target: {
			type: "positional",
			description: "Target pane (session:window.pane)",
			required: true,
		},
		"idle-time": {
			type: "string",
			description: "Idle time in seconds (default: 2)",
		},
		timeout: {
			type: "string",
			alias: "t",
			description: "Timeout in seconds (default: 30)",
		},
		interval: {
			type: "string",
			alias: "i",
			description: "Poll interval in seconds (default: 0.5)",
		},
		lines: {
			type: "string",
			alias: "S",
			description: "Scrollback lines to capture (default: 1000)",
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
		const idleTime = args["idle-time"]
			? Number.parseFloat(args["idle-time"])
			: undefined;
		const timeout = args.timeout ? Number.parseFloat(args.timeout) : undefined;
		const interval = args.interval
			? Number.parseFloat(args.interval)
			: undefined;
		const lines = args.lines ? Number.parseInt(args.lines, 10) : undefined;

		const result = await waitIdle({
			target: args.target,
			idleTime,
			timeout,
			interval,
			lines,
			socket: args.socket,
		});

		console.log(formatWaitIdle(result, { json: args.json }));

		if (!result.idle) {
			process.exit(1);
		}
	},
});
