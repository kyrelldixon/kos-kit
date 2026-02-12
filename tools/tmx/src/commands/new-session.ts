import { defineCommand } from "citty";
import { formatSessionCreated } from "../lib/output";
import { newSession } from "../lib/tmux";

export const newSessionCommand = defineCommand({
	meta: {
		name: "new-session",
		description: "Create a new detached tmux session",
	},
	args: {
		name: {
			type: "positional",
			description: "Session name",
			required: true,
		},
		dir: {
			type: "string",
			alias: "c",
			description: "Starting directory",
		},
		window: {
			type: "string",
			alias: "n",
			description: "Window name",
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
		const sessionName = await newSession({
			name: args.name,
			dir: args.dir,
			windowName: args.window,
			socket: args.socket,
		});
		console.log(formatSessionCreated(sessionName, { json: args.json }));
	},
});
