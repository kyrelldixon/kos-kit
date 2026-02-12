import { defineCommand } from "citty";
import { execute } from "../lib/execute";
import { formatExecute } from "../lib/output";

export const executeCommand = defineCommand({
	meta: {
		name: "execute",
		description: "Execute a command and capture output + exit code",
	},
	args: {
		target: {
			type: "positional",
			description: "Target pane (session:window.pane)",
			required: true,
		},
		command: {
			type: "positional",
			description: "Command to execute",
			required: true,
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

		const result = await execute({
			target: args.target,
			command: args.command,
			timeout,
			interval,
			socket: args.socket,
		});

		console.log(formatExecute(result, { json: args.json }));

		if (result.exitCode !== 0) {
			process.exit(1);
		}
	},
});
