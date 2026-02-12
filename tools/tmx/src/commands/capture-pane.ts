import { defineCommand } from "citty";
import { formatCapture } from "../lib/output";
import { capturePane } from "../lib/tmux";

export const capturePaneCommand = defineCommand({
	meta: {
		name: "capture-pane",
		description: "Capture the contents of a tmux pane",
	},
	args: {
		target: {
			type: "positional",
			description: "Target pane (session:window.pane)",
			required: true,
		},
		lines: {
			type: "string",
			alias: "S",
			description: "Number of scrollback lines to capture",
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
		const lines = args.lines ? Number.parseInt(args.lines, 10) : undefined;

		const content = await capturePane({
			target: args.target,
			lines,
			socket: args.socket,
		});

		console.log(formatCapture(content, { json: args.json }));
	},
});
