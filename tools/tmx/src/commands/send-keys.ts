import { defineCommand } from "citty";
import { formatSendKeys } from "../lib/output";
import { sendKeys } from "../lib/tmux";

export const sendKeysCommand = defineCommand({
	meta: {
		name: "send-keys",
		description: "Send keys to a tmux pane (with timing fix)",
	},
	args: {
		target: {
			type: "positional",
			description: "Target pane (session:window.pane)",
			required: true,
		},
		text: {
			type: "positional",
			description: "Text to send",
			required: true,
		},
		"no-enter": {
			type: "boolean",
			description: "Don't send Enter after text",
			default: false,
		},
		delay: {
			type: "string",
			description: "Delay in seconds between text and Enter (default: 0.1)",
		},
		"no-literal": {
			type: "boolean",
			description: "Don't use literal mode (send as key names instead)",
			default: false,
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
		const delay = args.delay ? Number.parseFloat(args.delay) : undefined;

		await sendKeys({
			target: args.target,
			text: args.text,
			enter: !args["no-enter"],
			delay,
			literal: !args["no-literal"],
			socket: args.socket,
		});

		console.log(formatSendKeys(args.target, { json: args.json }));
	},
});
