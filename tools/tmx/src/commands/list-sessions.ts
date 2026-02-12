import { defineCommand } from "citty";
import { formatList, formatSession } from "../lib/output";
import { listSessions } from "../lib/tmux";

export const listSessionsCommand = defineCommand({
	meta: {
		name: "list-sessions",
		description: "List tmux sessions",
	},
	args: {
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
		const sessions = await listSessions({ socket: args.socket });
		const output = formatList(sessions, formatSession, { json: args.json });
		console.log(output);
	},
});
